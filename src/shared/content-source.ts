import type { Product, ProductList, ProductQuery, PublicSite } from './models';

/**
 * Leituras públicas de conteúdo. Implementado no servidor pelo ContentService e
 * entregue ao Angular durante o SSR via REQUEST_CONTEXT — o SSR lê o banco diretamente,
 * sem requisição HTTP para si mesmo.
 */
export interface ContentSource {
  site(): PublicSite;
  productList(query: ProductQuery): ProductList;
  product(slug: string): Product | null;
}

/** Objeto passado por server.ts para cada renderização. */
export interface SsrRequestContext {
  readonly content: ContentSource;
  /** Origem pública (PUBLIC_SITE_URL ou a da requisição), para canônicas e Open Graph. */
  readonly siteOrigin: string;
}
