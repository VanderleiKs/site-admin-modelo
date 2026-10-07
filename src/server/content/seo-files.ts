/** Conteúdo de /robots.txt. */
export const robotsTxt = (origin: string) =>
  [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Gera /sitemap.xml a partir dos produtos e categorias ativos. */
export function renderSitemap(
  origin: string,
  data: { products: { slug: string; updatedAt: string }[]; categories: string[] },
): string {
  const url = (path: string, lastmod?: string) =>
    `  <url><loc>${escapeXml(origin + path)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
  const urls = [
    url('/'),
    url('/produtos'),
    url('/sobre'),
    url('/contato'),
    ...data.categories.map((slug) => url(`/produtos?categoria=${encodeURIComponent(slug)}`)),
    ...data.products.map((p) => url(`/produtos/${encodeURIComponent(p.slug)}`, p.updatedAt)),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}
