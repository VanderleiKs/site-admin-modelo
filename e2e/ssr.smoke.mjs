/**
 * Testes de fumaça do site renderizado no servidor (SSR) + fluxo de atualização.
 *
 * Pré-requisitos: servidor em execução (`npm run build && npm run serve`, ou `npm start`)
 * e um usuário administrador.
 *
 *   SITE_URL=http://localhost:4000 \
 *   E2E_ADMIN_EMAIL=admin@exemplo.com E2E_ADMIN_PASSWORD='...' \
 *   npm run test:ssr
 *
 * Usa apenas fetch + node:test (sem navegador).
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

const SITE = (process.env.SITE_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;

async function page(path) {
  const res = await fetch(SITE + path, { redirect: 'manual' });
  return { status: res.status, headers: res.headers, html: await res.text() };
}

function title(html) {
  return html.match(/<title>(.*?)<\/title>/s)?.[1] ?? '';
}

describe('Páginas públicas renderizadas no servidor', () => {
  it('página inicial: 200, HTML com conteúdo, SEO e dados para hidratação', async () => {
    const { status, html, headers } = await page('/');
    assert.equal(status, 200);
    assert.ok(title(html).length > 0, 'title vazio');
    assert.match(html, /<meta name="description" content="[^"]+"/);
    assert.match(html, /<link rel="canonical" href="https?:\/\/[^"]+\/"/);
    assert.match(html, /application\/ld\+json/);
    assert.match(html, /<h1[^>]*>[^<]+<\/h1>/, 'h1 renderizado no servidor');
    assert.match(
      html,
      /<script id="ng-state"[^>]*>[^<]*content:site/,
      'TransferState com o conteúdo do SSR',
    );
    assert.equal(headers.get('cache-control'), 'no-cache');
  });

  for (const path of ['/produtos', '/sobre', '/contato']) {
    it(`${path}: 200 com título próprio`, async () => {
      const { status, html } = await page(path);
      assert.equal(status, 200);
      assert.match(html, /<h1[^>]*>/);
      assert.match(html, new RegExp(`<link rel="canonical" href="[^"]*${path}"`));
    });
  }

  it('rota inexistente devolve HTTP 404 com noindex', async () => {
    const { status, html } = await page('/pagina-que-nao-existe');
    assert.equal(status, 404);
    assert.match(html, /noindex/);
  });

  it('produto inexistente devolve HTTP 404', async () => {
    const { status } = await page('/produtos/produto-que-nao-existe-123');
    assert.equal(status, 404);
  });

  it('painel /admin não é renderizado no servidor (sem dados administrativos no HTML)', async () => {
    const { status, html, headers } = await page('/admin/produtos');
    assert.equal(status, 200);
    assert.match(html, /<app-root><\/app-root>/);
    assert.equal(headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.doesNotMatch(html, /ng-state/);
  });

  it('robots.txt e sitemap.xml', async () => {
    const robots = await page('/robots.txt');
    assert.equal(robots.status, 200);
    assert.match(robots.html, /Disallow: \/admin/);
    assert.match(robots.html, /Sitemap: https?:\/\/.+\/sitemap\.xml/);
    const sitemap = await page('/sitemap.xml');
    assert.equal(sitemap.status, 200);
    assert.match(sitemap.html, /<urlset/);
    assert.match(sitemap.html, /\/produtos<\/loc>/);
  });

  it('API administrativa exige autenticação', async () => {
    const res = await fetch(`${SITE}/api/admin/products`);
    assert.equal(res.status, 401);
  });
});

describe(
  'Alteração no painel aparece no site sem rebuild',
  { skip: !EMAIL || !PASSWORD ? 'defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD' : false },
  () => {
    let cookies = '';
    let csrf = '';
    let productId = '';
    const slug = `teste-ssr-${Date.now()}`;

    const admin = async (method, path, body) => {
      const res = await fetch(`${SITE}/api${path}`, {
        method,
        headers: { 'content-type': 'application/json', cookie: cookies, 'x-xsrf-token': csrf },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      return { status: res.status, body: text ? JSON.parse(text) : null };
    };

    before(async () => {
      const res = await fetch(`${SITE}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
      });
      assert.equal(res.status, 200, 'login falhou');
      const set = res.headers.getSetCookie();
      cookies = set.map((c) => c.split(';')[0]).join('; ');
      csrf =
        set
          .find((c) => c.startsWith('XSRF-TOKEN='))
          ?.split(';')[0]
          .split('=')[1] ?? '';
    });

    after(async () => {
      if (productId) await admin('DELETE', `/admin/products/${productId}`);
    });

    it('cria, exibe, edita, desativa e exclui — o HTML SSR acompanha cada mudança', async () => {
      const cats = await admin('GET', '/admin/categories');
      assert.ok(cats.body.length > 0, 'é preciso ao menos uma categoria');

      const input = {
        name: 'Produto Teste SSR',
        slug,
        shortDescription: 'Criado pelo teste automatizado de SSR.',
        description: 'Descrição completa criada pelo teste automatizado.',
        categoryId: cats.body[0].id,
        priceCents: 1234,
        priceUnit: 'unidade',
      };
      const created = await admin('POST', '/admin/products', input);
      assert.equal(created.status, 201);
      productId = created.body.id;

      let p = await page(`/produtos/${slug}`);
      assert.equal(p.status, 200);
      assert.match(p.html, /Produto Teste SSR/);
      assert.match(p.html, /R\$\s?12,34/);

      const edited = await admin('PUT', `/admin/products/${productId}`, {
        ...input,
        name: 'Produto Teste SSR Editado',
        priceCents: null,
      });
      assert.equal(edited.status, 200);
      p = await page(`/produtos/${slug}`);
      assert.match(p.html, /Produto Teste SSR Editado/);
      assert.match(p.html, /Sob consulta/);
      assert.match(title(p.html), /Produto Teste SSR Editado/);

      const list = await page('/produtos');
      assert.match(list.html, /Produto Teste SSR Editado/);

      await admin('PATCH', `/admin/products/${productId}`, { active: false });
      p = await page(`/produtos/${slug}`);
      assert.equal(p.status, 404, 'produto inativo não deve ser exibido');
      assert.doesNotMatch((await page('/produtos')).html, /Produto Teste SSR Editado/);

      const del = await admin('DELETE', `/admin/products/${productId}`);
      assert.equal(del.status, 204);
      productId = '';
      assert.equal((await page(`/produtos/${slug}`)).status, 404);
    });
  },
);
