import { inject, Injectable, makeStateKey, REQUEST_CONTEXT, TransferState } from '@angular/core';
import { defer, type Observable, of } from 'rxjs';
import type { SsrRequestContext } from '../../../shared/content-source';
import type { Product, ProductList, ProductQuery, PublicSite } from '../../../shared/models';
import { ContentGateway, contentKeys } from './content-gateway';

/**
 * Implementação do SSR: lê o conteúdo diretamente do backend (mesmo processo, via
 * REQUEST_CONTEXT fornecido por server.ts) e serializa o resultado no TransferState.
 * Os dados são sempre os do banco no momento da requisição.
 */
@Injectable()
export class ServerContentGateway extends ContentGateway {
  private readonly context = inject(REQUEST_CONTEXT) as SsrRequestContext | null;
  private readonly transferState = inject(TransferState);

  site(): Observable<PublicSite> {
    return this.read(contentKeys.site(), (c) => c.site());
  }

  productList(query: ProductQuery = {}): Observable<ProductList> {
    return this.read(contentKeys.productList(query), (c) => c.productList(query));
  }

  product(slug: string): Observable<Product | null> {
    return this.read(contentKeys.product(slug), (c) => c.product(slug));
  }

  private read<T>(key: string, load: (content: SsrRequestContext['content']) => T): Observable<T> {
    return defer(() => {
      if (!this.context?.content) throw new Error('Conteúdo indisponível no contexto do SSR.');
      const value = load(this.context.content);
      this.transferState.set(makeStateKey<T>(key), value);
      return of(value);
    });
  }
}
