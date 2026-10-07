import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, type Observable, of, tap } from 'rxjs';
import type { AuthUser } from '../../../shared/models';

/** Estado de autenticação do painel. O token fica em cookie HttpOnly (inacessível ao JS). */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly http = inject(HttpClient);
  private readonly current = signal<AuthUser | null>(null);
  private checked = false;

  readonly user = this.current.asReadonly();

  ensureSession(): Observable<AuthUser | null> {
    if (this.checked) return of(this.current());
    return this.http.get<{ user: AuthUser }>('/api/auth/me').pipe(
      map((response) => response.user),
      catchError(() => of(null)),
      tap((user) => this.set(user)),
    );
  }

  login(email: string, password: string): Observable<AuthUser> {
    return this.http.post<{ user: AuthUser }>('/api/auth/login', { email, password }).pipe(
      map((response) => response.user),
      tap((user) => this.set(user)),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {}).pipe(
      catchError(() => of(undefined)),
      tap(() => this.clear()),
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http
      .put<void>('/api/auth/password', { currentPassword, newPassword })
      .pipe(tap(() => this.clear()));
  }

  clear(): void {
    this.current.set(null);
    this.checked = false;
  }

  private set(user: AuthUser | null): void {
    this.current.set(user);
    this.checked = true;
  }
}
