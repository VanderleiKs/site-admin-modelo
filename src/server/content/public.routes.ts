import { Router } from 'express';
import { z } from 'zod';
import { SLUG_PATTERN } from '../../shared/models';
import { notFound } from '../http/errors';
import { parseBody } from '../http/validation';
import type { Services } from '../services';

const querySchema = z.object({
  category: z.string().regex(SLUG_PATTERN).max(140).optional(),
  featured: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/** Leituras públicas usadas pelo navegador ao navegar entre páginas (o SSR chama o ContentService direto). */
export function publicRoutes({ content }: Services): Router {
  const router = Router();
  router.use((_req, res, next) => {
    // Pode ser guardado, mas sempre revalidado (ETag do Express → 304 se nada mudou).
    res.setHeader('Cache-Control', 'no-cache');
    next();
  });

  router.get('/site', (_req, res) => {
    res.json(content.site());
  });

  router.get('/products', (req, res) => {
    const query = parseBody(querySchema, req.query);
    res.json(
      content.productList({
        category: query.category,
        featured: query.featured === 'true',
        limit: query.limit,
      }),
    );
  });

  router.get('/products/:slug', (req, res) => {
    const product = content.product(String(req.params['slug']).slice(0, 140));
    if (!product) throw notFound('Produto não encontrado.');
    res.json(product);
  });

  return router;
}
