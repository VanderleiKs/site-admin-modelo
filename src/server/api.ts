import express, { Router } from 'express';
import { authRoutes } from './auth/auth.routes';
import { requireAuth } from './auth/auth.middleware';
import { adminCatalogRoutes } from './catalog/admin-catalog.routes';
import { publicRoutes } from './content/public.routes';
import { errorHandler, HttpError } from './http/errors';
import { mediaRoutes } from './media/media.routes';
import type { Services } from './services';
import { settingsRoutes } from './settings/settings.routes';

/**
 * API REST (montada em /api pelo server.ts).
 *   /api/auth/*     login, logout, sessão, troca de senha
 *   /api/public/*   leitura pública (produtos ativos e configurações)
 *   /api/admin/*    painel — exige sessão + token CSRF em escritas
 */
export function createApiRouter(services: Services): Router {
  const api = Router();
  api.use(express.json({ limit: '100kb' }));
  api.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  api.use('/auth', authRoutes(services));
  api.use('/public', publicRoutes(services));

  const admin = Router();
  admin.use(requireAuth(services));
  admin.use('/media', mediaRoutes(services));
  admin.use('/settings', settingsRoutes(services));
  admin.use(adminCatalogRoutes(services));
  api.use('/admin', admin);

  api.use((_req, _res, next) => next(new HttpError(404, 'Rota não encontrada.')));
  api.use(errorHandler);
  return api;
}
