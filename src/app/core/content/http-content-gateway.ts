import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable, makeStateKey, TransferState } from '@angular/core';
import { catchError, type Observable, of, throwError } from 'rxjs';
import type { Product, ProductList, ProductQuery, PublicSite } from '../../../shared/models';
import { ContentGateway, contentKeys } from './content-gateway';

/** Implementação do navegador: TransferState na primeira renderização, API REST nas navegações. */
@Injectable()
export class HttpContentGateway extends ContentGateway {
  private readonly http = inject(HttpClient);
  private readonly transferState = inject(TransferState);

  site(): Observable<PublicSite> {
    return this.fromState(contentKeys.site()) ?? this.http.get<PublicSite>('/api/public/site');
  }

  productList(query: ProductQuery = {}): Observable<ProductList> {
    let params = new HttpParams();
    if (query.category) params = params.set('category', query.category);
    if (query.featured) params = params.set('featured', 'true');
    if (query.limit) params = params.set('limit', query.limit);
    return (
      this.fromState(contentKeys.productList(query)) ??
      this.http.get<ProductList>('/api/public/products', { params })
    );
  }

  product(slug: string): Observable<Product | null> {
    return (
      this.fromState<Product | null>(contentKeys.product(slug)) ??
      this.http
        .get<Product>(`/api/public/products/${encodeURIComponent(slug)}`)
        .pipe(
          catchError((e: unknown) =>
            e instanceof HttpErrorResponse && e.status === 404 ? of(null) : throwError(() => e),
          ),
        )
    );
  }

  /** Consome (uma única vez) o valor serializado pelo SSR, garantindo hidratação idêntica. */
  private fromState<T>(key: string): Observable<T> | null {
    const stateKey = makeStateKey<T>(key);
    if (!this.transferState.hasKey(stateKey)) return null;
    const value = this.transferState.get(stateKey, null as T);
    this.transferState.remove(stateKey);
    return of(value);
  }
}
