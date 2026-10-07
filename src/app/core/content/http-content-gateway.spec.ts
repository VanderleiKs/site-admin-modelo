import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { makeStateKey, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { contentKeys } from './content-gateway';
import { HttpContentGateway } from './http-content-gateway';

describe('HttpContentGateway', () => {
  let gateway: HttpContentGateway;
  let http: HttpTestingController;
  let state: TransferState;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HttpContentGateway, provideHttpClient(), provideHttpClientTesting()],
    });
    gateway = TestBed.inject(HttpContentGateway);
    http = TestBed.inject(HttpTestingController);
    state = TestBed.inject(TransferState);
  });
  afterEach(() => http.verify());

  it('na hidratação usa o dado do SSR (TransferState) uma única vez, sem chamar a API', async () => {
    const key = makeStateKey<unknown>(contentKeys.productList({ featured: true }));
    state.set(key, { items: [], category: null });
    expect(await firstValueFrom(gateway.productList({ featured: true }))).toEqual({
      items: [],
      category: null,
    });
    expect(state.hasKey(key)).toBe(false);

    // Depois da hidratação, consulta a API normalmente.
    const next = firstValueFrom(gateway.productList({ featured: true }));
    http.expectOne('/api/public/products?featured=true').flush({ items: [], category: null });
    await next;
  });

  it('produto inexistente (404) vira null', async () => {
    const result = firstValueFrom(gateway.product('nao-existe'));
    http
      .expectOne('/api/public/products/nao-existe')
      .flush({ message: 'x' }, { status: 404, statusText: 'Not Found' });
    expect(await result).toBeNull();
  });
});
