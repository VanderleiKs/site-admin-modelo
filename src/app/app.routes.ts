import { inject } from '@angular/core';
import type { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth-guards';
import { SiteStore } from './core/site/site-store';
import { PublicLayout } from './features/public/layout/public-layout';

export const routes: Routes = [
  // Painel administrativo (carregado sob demanda)
  {
    path: 'admin/login',
    canActivate: [guestGuard],
    title: 'Entrar — Painel',
    loadComponent: () => import('./features/admin/pages/login/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./features/admin/layout/admin-layout').then((m) => m.AdminLayout),
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },

  // Site público
  {
    path: '',
    component: PublicLayout,
    // As configurações do site são carregadas antes da renderização (inclusive no SSR).
    resolve: { site: () => inject(SiteStore).load() },
    loadChildren: () => import('./features/public/public.routes').then((m) => m.publicRoutes),
  },
];
