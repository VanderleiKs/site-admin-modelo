import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ACCEPTED_IMAGE_TYPES, type ImageRef, MAX_UPLOAD_BYTES } from '../../shared/models';
import type { Database } from '../db/database';
import { badRequest, HttpError, notFound } from '../http/errors';

type AcceptedType = (typeof ACCEPTED_IMAGE_TYPES)[number];

const EXTENSIONS: Record<AcceptedType | 'image/svg+xml', string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

/** URL pública de um arquivo de mídia (servido pelo Express com cache imutável). */
export const mediaUrl = (fileName: string) => `/uploads/${fileName}`;

/**
 * Identifica o tipo real pelo conteúdo ("magic bytes"). A extensão e o Content-Type
 * enviados pelo navegador não são confiáveis. SVG não é aceito em uploads (pode conter script).
 */
export function detectImageType(buffer: Buffer): AcceptedType | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return 'image/png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP')
    return 'image/webp';
  return null;
}

export class MediaService {
  constructor(
    private readonly db: Database,
    private readonly uploadsDir: string,
  ) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  /** Grava uma imagem enviada pelo painel (já validada quanto ao tamanho pelo parser). */
  async upload(buffer: Buffer, originalName: string, alt: string | null): Promise<ImageRef> {
    if (!buffer.length) throw badRequest('Nenhum arquivo enviado.');
    if (buffer.length > MAX_UPLOAD_BYTES)
      throw new HttpError(413, 'A imagem deve ter no máximo 5 MB.');
    const type = detectImageType(buffer);
    if (!type) throw new HttpError(415, 'Formato não suportado. Envie JPEG, PNG ou WebP.');
    return this.store(buffer, type, originalName, alt);
  }

  /** Uso interno (seed): permite SVG gerado pela própria aplicação. */
  async store(
    buffer: Buffer,
    type: AcceptedType | 'image/svg+xml',
    originalName: string,
    alt: string | null,
  ): Promise<ImageRef> {
    const id = randomUUID();
    const fileName = `${id}.${EXTENSIONS[type]}`;
    await writeFile(join(this.uploadsDir, fileName), buffer, { flag: 'wx' });
    try {
      this.db
        .prepare(
          'INSERT INTO media (id, file_name, mime_type, size_bytes, original_name, alt) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(
          id,
          fileName,
          type,
          buffer.length,
          sanitizeName(originalName),
          alt?.trim().slice(0, 200) || null,
        );
    } catch (error) {
      await rm(join(this.uploadsDir, fileName), { force: true });
      throw error;
    }
    return { id, url: mediaUrl(fileName), alt: alt?.trim() || null };
  }

  /** Mapa id → ImageRef para os ids informados (ignora inexistentes). */
  findMany(ids: readonly string[]): Map<string, ImageRef> {
    const unique = [...new Set(ids)];
    const result = new Map<string, ImageRef>();
    if (!unique.length) return result;
    const rows = this.db
      .prepare(
        `SELECT id, file_name, alt FROM media WHERE id IN (${unique.map(() => '?').join(',')})`,
      )
      .all(...unique);
    for (const row of rows) {
      result.set(String(row['id']), {
        id: String(row['id']),
        url: mediaUrl(String(row['file_name'])),
        alt: row['alt'] === null ? null : String(row['alt']),
      });
    }
    return result;
  }

  assertExist(ids: readonly (string | null | undefined)[]): void {
    const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
    if (this.findMany(wanted).size !== wanted.length)
      throw badRequest('Uma ou mais imagens informadas não existem.');
  }

  /** Quantos registros (produtos, galerias, configurações) usam a imagem. */
  usageCount(id: string): number {
    const count = (sql: string) => Number(this.db.prepare(sql).get(id)?.['n'] ?? 0);
    return (
      count('SELECT COUNT(*) AS n FROM products WHERE main_image_id = ?') +
      count('SELECT COUNT(*) AS n FROM product_images WHERE media_id = ?') +
      count(
        `SELECT COUNT(*) AS n FROM settings WHERE ?1 IN (
           json_extract(data, '$.logoId'), json_extract(data, '$.heroImageId'), json_extract(data, '$.aboutImageId'))`,
      )
    );
  }

  /** Exclusão pelo painel: recusa se a imagem ainda estiver em uso. */
  async delete(id: string): Promise<void> {
    const row = this.db.prepare('SELECT file_name FROM media WHERE id = ?').get(id);
    if (!row) throw notFound('Imagem não encontrada.');
    const uses = this.usageCount(id);
    if (uses > 0) throw new HttpError(409, `A imagem está em uso em ${uses} lugar(es).`);
    this.db.prepare('DELETE FROM media WHERE id = ?').run(id);
    await rm(join(this.uploadsDir, String(row['file_name'])), { force: true });
  }

  /** Após substituir/remover imagens: apaga do disco as que nenhum registro usa mais. */
  async deleteIfUnused(ids: Iterable<string | null | undefined>): Promise<void> {
    for (const id of new Set([...ids].filter((v): v is string => Boolean(v)))) {
      if (this.usageCount(id) > 0) continue;
      const row = this.db.prepare('SELECT file_name FROM media WHERE id = ?').get(id);
      if (!row) continue;
      this.db.prepare('DELETE FROM media WHERE id = ?').run(id);
      await rm(join(this.uploadsDir, String(row['file_name'])), { force: true });
    }
  }

  /** Remove uploads abandonados (sem uso) com mais de `hours` horas. */
  async cleanupOrphans(hours = 24): Promise<void> {
    const cutoff = new Date(Date.now() - hours * 3_600_000).toISOString();
    const rows = this.db.prepare('SELECT id FROM media WHERE created_at < ?').all(cutoff);
    await this.deleteIfUnused(rows.map((r) => String(r['id'])));
  }
}

function sanitizeName(name: string): string {
  return (name || 'imagem').replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 150);
}
