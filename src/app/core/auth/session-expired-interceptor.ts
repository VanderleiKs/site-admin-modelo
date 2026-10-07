import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from './auth-store';

/** 401 em chamada administrativa = sessão expirada: volta para o login. */
export const sessionExpiredInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        request.url.startsWith('/api/admin/')
      ) {
        auth.clear();
        void router.navigate(['/admin/login'], { queryParams: { expirou: 1 } });
      }
      return throwError(() => error);
    }),
  );
};
