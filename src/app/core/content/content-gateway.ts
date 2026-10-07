import type { Observable } from 'rxjs';
import type { Product, ProductList, ProductQuery, PublicSite } from '../../../shared/models';

/**
 * Porta de acesso ao conteúdo público. Duas implementações:
 *  - ServerContentGateway: no SSR, lê direto do backend (in-process) e grava no TransferState;
 *  - HttpContentGateway: no navegador, reaproveita o TransferState na hidratação e usa a API depois.
 * Os componentes dependem apenas desta abstração.
 */
export abstract class ContentGateway {
  abstract site(): Observable<PublicSite>;
  abstract productList(query?: ProductQuery): Observable<ProductList>;
  /** Emite null quando o produto não existe ou está inativo. */
  abstract product(slug: string): Observable<Product | null>;
}

export const contentKeys = {
  site: () => 'content:site',
  productList: (q: ProductQuery) =>
    `content:products:${q.category ?? ''}:${q.featured ? 1 : 0}:${q.limit ?? ''}`,
  product: (slug: string) => `content:product:${slug}`,
} as const;
