import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthStore } from './auth-store';

/** Protege a navegação no painel. A autorização real é sempre verificada pela API. */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  return inject(AuthStore)
    .ensureSession()
    .pipe(
      map((user) =>
        user
          ? true
          : router.createUrlTree(['/admin/login'], { queryParams: { voltar: state.url } }),
      ),
    );
};

/** Usuário já autenticado não precisa ver a tela de login. */
export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(AuthStore)
    .ensureSession()
    .pipe(map((user) => (user ? router.createUrlTree(['/admin']) : true)));
};
