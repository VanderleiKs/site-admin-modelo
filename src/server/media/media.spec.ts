import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PNG_1X1, startTestServer, TestClient, type TestServer } from '../testing/test-server';
import { detectImageType } from './media.service';

describe('detecção de tipo de imagem', () => {
  it('usa o conteúdo, não a extensão', () => {
    expect(detectImageType(PNG_1X1)).toBe('image/png');
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(
      'image/jpeg',
    );
    expect(detectImageType(Buffer.from('RIFF\0\0\0\0WEBPVP8 '))).toBe('image/webp');
    expect(
      detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')),
    ).toBeNull();
  });
});

describe('upload de imagens (API)', () => {
  let server: TestServer;
  let admin: TestClient;
  const file = (url: string) =>
    join(server.services.config.uploadsDir, url.replace('/uploads/', ''));
  const upload = (body: Uint8Array, type = 'image/png') =>
    admin.request('POST', '/api/admin/media', body, {
      'content-type': type,
      'x-file-name': 'foto.png',
    });

  beforeEach(async () => {
    server = await startTestServer();
    admin = new TestClient(server.url);
    await admin.login();
  });
  afterEach(() => server.close());

  it('grava imagem válida', async () => {
    const response = await upload(PNG_1X1);
    expect(response.status).toBe(201);
    expect(response.body.url).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/);
    expect(existsSync(file(response.body.url))).toBe(true);
  });

  it('recusa conteúdo que não é imagem, SVG e tipos não aceitos', async () => {
    expect((await upload(Buffer.from('<script>alert(1)</script> não é imagem'))).status).toBe(415);
    expect(
      (await upload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'image/svg+xml'))
        .status,
    ).toBe(415);
    expect((await upload(PNG_1X1, 'application/pdf')).status).toBe(415);
  });

  it('recusa arquivo acima de 5 MB', async () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 10, 0);
    PNG_1X1.copy(big);
    expect((await upload(big)).status).toBe(413);
  });

  it('mantém imagem usada por outro registro e apaga a que ficou sem uso', async () => {
    const category = (
      await admin.request('POST', '/api/admin/categories', { name: 'Cat', slug: 'cat' })
    ).body;
    const a = (await upload(PNG_1X1)).body;
    const b = (await upload(PNG_1X1)).body;
    const base = {
      shortDescription: 'Descrição curta ok.',
      description: 'Descrição completa ok.',
      categoryId: category.id,
    };
    const p1 = (
      await admin.request('POST', '/api/admin/products', {
        ...base,
        name: 'P1',
        slug: 'p1',
        mainImageId: a.id,
      })
    ).body;
    await admin.request('POST', '/api/admin/products', {
      ...base,
      name: 'P2',
      slug: 'p2',
      galleryImageIds: [a.id],
    });

    expect((await admin.request('DELETE', `/api/admin/media/${a.id}`)).status).toBe(409);

    // troca a principal de P1: "a" continua (galeria de P2)
    await admin.request('PUT', `/api/admin/products/${p1.id}`, {
      ...base,
      name: 'P1',
      slug: 'p1',
      mainImageId: b.id,
    });
    expect(existsSync(file(a.url))).toBe(true);

    // remove a principal de P1: "b" fica sem uso e é apagada
    await admin.request('PUT', `/api/admin/products/${p1.id}`, {
      ...base,
      name: 'P1',
      slug: 'p1',
      mainImageId: null,
    });
    expect(existsSync(file(b.url))).toBe(false);
  });
});
