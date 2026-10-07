import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startTestServer, TestClient, type TestServer } from '../testing/test-server';

describe('produtos e categorias (API)', () => {
  let server: TestServer;
  let admin: TestClient;
  let visitor: TestClient;
  let categoryId: string;

  const product = (overrides: Record<string, unknown> = {}) => ({
    name: 'Queijo Teste',
    slug: 'queijo-teste',
    shortDescription: 'Descrição curta do queijo.',
    description: 'Descrição completa do queijo de teste.',
    categoryId,
    priceCents: 4590,
    priceUnit: 'kg',
    ...overrides,
  });

  beforeEach(async () => {
    server = await startTestServer();
    admin = new TestClient(server.url);
    visitor = new TestClient(server.url);
    await admin.login();
    categoryId = (
      await admin.request('POST', '/api/admin/categories', { name: 'Frescos', slug: 'frescos' })
    ).body.id;
  });
  afterEach(() => server.close());

  it('valida os dados no backend com mensagens por campo', async () => {
    const response = await admin.request(
      'POST',
      '/api/admin/products',
      product({ name: '', slug: 'Slug Inválido', priceCents: -1 }),
    );
    expect(response.status).toBe(400);
    const fields = response.body.errors.map((e: { field: string }) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'slug', 'priceCents']));
  });

  it('cria, lista, pesquisa, edita e exclui', async () => {
    const created = await admin.request('POST', '/api/admin/products', product());
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      slug: 'queijo-teste',
      priceCents: 4590,
      active: true,
      category: { id: categoryId },
    });

    // preço opcional (sob consulta)
    const quote = await admin.request(
      'POST',
      '/api/admin/products',
      product({ name: 'Sob Consulta', slug: 'sob-consulta', priceCents: null }),
    );
    expect(quote.body.priceCents).toBeNull();

    expect(
      (await admin.request('POST', '/api/admin/products', product({ name: 'Outro' }))).status,
    ).toBe(409);

    const search = await admin.request('GET', '/api/admin/products?q=consulta');
    expect(search.body.map((p: { slug: string }) => p.slug)).toEqual(['sob-consulta']);

    const updated = await admin.request(
      'PUT',
      `/api/admin/products/${created.body.id}`,
      product({ name: 'Editado', featured: true }),
    );
    expect(updated.body).toMatchObject({ name: 'Editado', featured: true });

    expect((await admin.request('DELETE', `/api/admin/products/${created.body.id}`)).status).toBe(
      204,
    );
    expect((await admin.request('GET', `/api/admin/products/${created.body.id}`)).status).toBe(404);
  });

  it('o site público reflete cada alteração imediatamente', async () => {
    const created = await admin.request('POST', '/api/admin/products', product());
    const id = created.body.id;

    expect((await visitor.request('GET', '/api/public/products/queijo-teste')).body.name).toBe(
      'Queijo Teste',
    );

    await admin.request('PUT', `/api/admin/products/${id}`, product({ name: 'Nome Novo' }));
    expect((await visitor.request('GET', '/api/public/products/queijo-teste')).body.name).toBe(
      'Nome Novo',
    );

    await admin.request('PATCH', `/api/admin/products/${id}`, { active: false });
    expect((await visitor.request('GET', '/api/public/products/queijo-teste')).status).toBe(404);
    expect((await visitor.request('GET', '/api/public/products')).body.items).toHaveLength(0);

    await admin.request('PATCH', `/api/admin/products/${id}`, { active: true, featured: true });
    const featured = await visitor.request('GET', '/api/public/products?featured=true');
    expect(featured.body.items.map((p: { slug: string }) => p.slug)).toEqual(['queijo-teste']);
  });

  it('filtra o catálogo público por categoria', async () => {
    const other = await admin.request('POST', '/api/admin/categories', {
      name: 'Curados',
      slug: 'curados',
    });
    await admin.request('POST', '/api/admin/products', product());
    await admin.request(
      'POST',
      '/api/admin/products',
      product({ name: 'Curado', slug: 'curado', categoryId: other.body.id }),
    );
    const list = await visitor.request('GET', '/api/public/products?category=curados');
    expect(list.body.items.map((p: { slug: string }) => p.slug)).toEqual(['curado']);
    expect(list.body.category.slug).toBe('curados');
    const unknown = await visitor.request('GET', '/api/public/products?category=inexistente');
    expect(unknown.body).toEqual({ items: [], category: null });
  });

  it('não exclui categoria com produtos sem informar destino', async () => {
    const other = await admin.request('POST', '/api/admin/categories', {
      name: 'Destino',
      slug: 'destino',
    });
    const created = await admin.request('POST', '/api/admin/products', product());
    expect((await admin.request('DELETE', `/api/admin/categories/${categoryId}`)).status).toBe(409);
    const moved = await admin.request(
      'DELETE',
      `/api/admin/categories/${categoryId}?moveTo=${other.body.id}`,
    );
    expect(moved.body.movedProducts).toBe(1);
    expect(
      (await admin.request('GET', `/api/admin/products/${created.body.id}`)).body.category.id,
    ).toBe(other.body.id);
  });

  it('dashboard traz contagens reais', async () => {
    await admin.request('POST', '/api/admin/products', product({ featured: true }));
    const dashboard = await admin.request('GET', '/api/admin/dashboard');
    expect(dashboard.body).toMatchObject({
      productCount: 1,
      activeProductCount: 1,
      featuredCount: 1,
      categoryCount: 1,
      productsWithoutImage: 1,
    });
  });
});
