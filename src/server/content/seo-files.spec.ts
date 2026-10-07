import { describe, expect, it } from 'vitest';
import { renderSitemap, robotsTxt } from './seo-files';

describe('robots e sitemap', () => {
  it('robots bloqueia o painel e aponta o sitemap', () => {
    const robots = robotsTxt('https://exemplo.com.br');
    expect(robots).toContain('Disallow: /admin');
    expect(robots).toContain('Sitemap: https://exemplo.com.br/sitemap.xml');
  });

  it('sitemap inclui páginas, categorias e produtos com escape de XML', () => {
    const xml = renderSitemap('https://exemplo.com.br', {
      products: [{ slug: 'queijo-colonial', updatedAt: '2026-10-07T00:00:00.000Z' }],
      categories: ['frescos'],
    });
    expect(xml).toContain(
      '<loc>https://exemplo.com.br/produtos/queijo-colonial</loc><lastmod>2026-10-07T00:00:00.000Z</lastmod>',
    );
    expect(xml).toContain('/produtos?categoria=frescos');
    expect(xml).not.toMatch(/\?categoria=frescos[^<]*&[^a]/);
  });
});
