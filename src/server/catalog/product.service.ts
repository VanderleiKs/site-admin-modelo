import { randomUUID } from 'node:crypto';
import type { Availability, Product, ProductInput } from '../../shared/models';
import { type Database, nowIso, transaction } from '../db/database';
import { badRequest, conflict, notFound } from '../http/errors';
import { parseBody } from '../http/validation';
import type { MediaService } from '../media/media.service';
import { productSchema } from './catalog.schemas';

export interface ProductFilter {
  readonly onlyActive?: boolean;
  readonly featured?: boolean;
  readonly categoryId?: string;
  readonly search?: string;
  readonly limit?: number;
}

const BASE_SELECT = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug
    FROM products p JOIN categories c ON c.id = p.category_id`;

export class ProductService {
  constructor(
    private readonly db: Database,
    private readonly media: MediaService,
  ) {}

  list(filter: ProductFilter = {}): Product[] {
    const where: string[] = [];
    const params: (string | number)[] = [];
    if (filter.onlyActive) where.push('p.active = 1');
    if (filter.featured) where.push('p.featured = 1');
    if (filter.categoryId) {
      where.push('p.category_id = ?');
      params.push(filter.categoryId);
    }
    if (filter.search) {
      where.push("p.name LIKE ? ESCAPE '\\'");
      params.push(`%${filter.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    }
    const sql = `${BASE_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY p.sort_order, p.name ${filter.limit ? 'LIMIT ?' : ''}`;
    if (filter.limit) params.push(filter.limit);
    return this.hydrate(this.db.prepare(sql).all(...params));
  }

  findById(id: string): Product | null {
    return this.hydrate(this.db.prepare(`${BASE_SELECT} WHERE p.id = ?`).all(id))[0] ?? null;
  }

  findActiveBySlug(slug: string): Product | null {
    return (
      this.hydrate(
        this.db.prepare(`${BASE_SELECT} WHERE p.slug = ? AND p.active = 1`).all(slug),
      )[0] ?? null
    );
  }

  get(id: string): Product {
    const product = this.findById(id);
    if (!product) throw notFound('Produto não encontrado.');
    return product;
  }

  create(body: unknown): Product {
    const input = this.validate(body);
    const id = randomUUID();
    transaction(this.db, () => {
      this.db
        .prepare(
          `INSERT INTO products (id, name, slug, short_description, description, category_id, price_cents, price_unit,
             availability, main_image_id, featured, active, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          input.name,
          input.slug,
          input.shortDescription,
          input.description,
          input.categoryId,
          input.priceCents,
          input.priceUnit,
          input.availability,
          input.mainImageId,
          Number(input.featured),
          Number(input.active),
          input.sortOrder,
        );
      this.replaceGallery(id, input.galleryImageIds);
    });
    return this.get(id);
  }

  async update(id: string, body: unknown): Promise<Product> {
    const before = this.get(id);
    const input = this.validate(body, id);
    transaction(this.db, () => {
      this.db
        .prepare(
          `UPDATE products SET name = ?, slug = ?, short_description = ?, description = ?, category_id = ?,
             price_cents = ?, price_unit = ?, availability = ?, main_image_id = ?, featured = ?, active = ?,
             sort_order = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(
          input.name,
          input.slug,
          input.shortDescription,
          input.description,
          input.categoryId,
          input.priceCents,
          input.priceUnit,
          input.availability,
          input.mainImageId,
          Number(input.featured),
          Number(input.active),
          input.sortOrder,
          nowIso(),
          id,
        );
      this.replaceGallery(id, input.galleryImageIds);
    });
    // Imagens substituídas são apagadas se nenhum outro registro as usa.
    await this.media.deleteIfUnused([before.mainImage?.id, ...before.gallery.map((g) => g.id)]);
    return this.get(id);
  }

  /** Alterações rápidas pela listagem (ativar/desativar, destacar). */
  setFlags(id: string, flags: { active?: boolean; featured?: boolean }): Product {
    const current = this.get(id);
    this.db
      .prepare('UPDATE products SET active = ?, featured = ?, updated_at = ? WHERE id = ?')
      .run(
        Number(flags.active ?? current.active),
        Number(flags.featured ?? current.featured),
        nowIso(),
        id,
      );
    return this.get(id);
  }

  async delete(id: string): Promise<void> {
    const product = this.get(id);
    this.db.prepare('DELETE FROM products WHERE id = ?').run(id);
    await this.media.deleteIfUnused([product.mainImage?.id, ...product.gallery.map((g) => g.id)]);
  }

  private validate(body: unknown, exceptId = ''): ProductInput {
    const input = parseBody(productSchema, body);
    if (!this.db.prepare('SELECT 1 FROM categories WHERE id = ?').get(input.categoryId)) {
      throw badRequest('Categoria inexistente.', [
        { field: 'categoryId', message: 'Selecione uma categoria válida.' },
      ]);
    }
    if (
      this.db.prepare('SELECT 1 FROM products WHERE slug = ? AND id <> ?').get(input.slug, exceptId)
    ) {
      throw conflict('Já existe um produto com este slug.');
    }
    this.media.assertExist([input.mainImageId, ...input.galleryImageIds]);
    return input;
  }

  private replaceGallery(productId: string, mediaIds: readonly string[]): void {
    this.db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
    const insert = this.db.prepare(
      'INSERT INTO product_images (product_id, media_id, position) VALUES (?, ?, ?)',
    );
    mediaIds.forEach((mediaId, position) => insert.run(productId, mediaId, position));
  }

  /** Converte linhas em Product, carregando imagens em poucas consultas. */
  private hydrate(rows: Record<string, unknown>[]): Product[] {
    if (!rows.length) return [];
    const ids = rows.map((r) => String(r['id']));
    const gallery = this.db
      .prepare(
        `SELECT product_id, media_id FROM product_images
          WHERE product_id IN (${ids.map(() => '?').join(',')}) ORDER BY position`,
      )
      .all(...ids);
    const images = this.media.findMany([
      ...rows.map((r) => r['main_image_id']).filter((v): v is string => typeof v === 'string'),
      ...gallery.map((g) => String(g['media_id'])),
    ]);
    return rows.map((row) => ({
      id: String(row['id']),
      name: String(row['name']),
      slug: String(row['slug']),
      shortDescription: String(row['short_description']),
      description: String(row['description']),
      category: {
        id: String(row['category_id']),
        name: String(row['category_name']),
        slug: String(row['category_slug']),
      },
      priceCents: row['price_cents'] === null ? null : Number(row['price_cents']),
      priceUnit: row['price_unit'] === null ? null : String(row['price_unit']),
      availability: String(row['availability']) as Availability,
      featured: Number(row['featured']) === 1,
      active: Number(row['active']) === 1,
      sortOrder: Number(row['sort_order']),
      mainImage:
        typeof row['main_image_id'] === 'string'
          ? (images.get(row['main_image_id']) ?? null)
          : null,
      gallery: gallery
        .filter((g) => g['product_id'] === row['id'])
        .map((g) => images.get(String(g['media_id'])))
        .filter((img) => img !== undefined),
      updatedAt: String(row['updated_at']),
    }));
  }
}
