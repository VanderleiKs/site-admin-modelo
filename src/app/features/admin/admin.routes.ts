import type { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    title: 'Visão geral — Painel',
    loadComponent: () => import('./pages/dashboard/dashboard-page').then((m) => m.DashboardPage),
  },
  {
    path: 'produtos',
    title: 'Produtos — Painel',
    loadComponent: () =>
      import('./pages/product-list/product-list-page').then((m) => m.ProductListPage),
  },
  {
    path: 'produtos/novo',
    title: 'Novo produto — Painel',
    loadComponent: () =>
      import('./pages/product-form/product-form-page').then((m) => m.ProductFormPage),
  },
  {
    path: 'produtos/:id',
    title: 'Editar produto — Painel',
    loadComponent: () =>
      import('./pages/product-form/product-form-page').then((m) => m.ProductFormPage),
  },
  {
    path: 'categorias',
    title: 'Categorias — Painel',
    loadComponent: () => import('./pages/categories/categories-page').then((m) => m.CategoriesPage),
  },
  {
    path: 'configuracoes',
    title: 'Configurações — Painel',
    loadComponent: () => import('./pages/settings/settings-page').then((m) => m.SettingsPage),
  },
  {
    path: 'conta',
    title: 'Minha conta — Painel',
    loadComponent: () => import('./pages/account/account-page').then((m) => m.AccountPage),
  },
];
