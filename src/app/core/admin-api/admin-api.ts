import { HttpClient, type HttpEvent, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  Category,
  CategoryInput,
  DashboardSummary,
  ImageRef,
  Product,
  ProductInput,
  SiteSettings,
  SiteSettingsInput,
} from '../../../shared/models';

/**
 * Chamadas da API administrativa. Usado só no navegador (o painel não é renderizado no
 * servidor). O HttpClient envia o cabeçalho X-XSRF-TOKEN automaticamente.
 */
@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);

  dashboard(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>('/api/admin/dashboard');
  }

  products(filter: { q?: string; categoryId?: string } = {}): Observable<Product[]> {
    let params = new HttpParams();
    if (filter.q) params = params.set('q', filter.q);
    if (filter.categoryId) params = params.set('categoryId', filter.categoryId);
    return this.http.get<Product[]>('/api/admin/products', { params });
  }

  product(id: string): Observable<Product> {
    return this.http.get<Product>(`/api/admin/products/${id}`);
  }

  saveProduct(input: ProductInput, id?: string): Observable<Product> {
    return id
      ? this.http.put<Product>(`/api/admin/products/${id}`, input)
      : this.http.post<Product>('/api/admin/products', input);
  }

  setProductFlags(
    id: string,
    flags: { active?: boolean; featured?: boolean },
  ): Observable<Product> {
    return this.http.patch<Product>(`/api/admin/products/${id}`, flags);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`/api/admin/products/${id}`);
  }

  categories(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/admin/categories');
  }

  saveCategory(input: CategoryInput, id?: string): Observable<Category> {
    return id
      ? this.http.put<Category>(`/api/admin/categories/${id}`, input)
      : this.http.post<Category>('/api/admin/categories', input);
  }

  deleteCategory(id: string, moveTo?: string): Observable<{ movedProducts: number }> {
    const params = moveTo ? new HttpParams().set('moveTo', moveTo) : undefined;
    return this.http.delete<{ movedProducts: number }>(`/api/admin/categories/${id}`, { params });
  }

  settings(): Observable<SiteSettings> {
    return this.http.get<SiteSettings>('/api/admin/settings');
  }

  saveSettings(input: SiteSettingsInput): Observable<SiteSettings> {
    return this.http.put<SiteSettings>('/api/admin/settings', input);
  }

  /** Envia o arquivo como corpo binário, com eventos de progresso. */
  uploadImage(file: File, alt?: string): Observable<HttpEvent<ImageRef>> {
    return this.http.post<ImageRef>('/api/admin/media', file, {
      headers: {
        'Content-Type': file.type,
        'X-File-Name': encodeURIComponent(file.name),
        ...(alt ? { 'X-Image-Alt': encodeURIComponent(alt) } : {}),
      },
      reportProgress: true,
      observe: 'events',
    });
  }
}
