import { Router } from 'express';
import { z } from 'zod';
import { idSchema, parseBody } from '../http/validation';
import type { Services } from '../services';

const listSchema = z.object({
  q: z.string().trim().max(100).optional(),
  categoryId: idSchema.optional(),
});
const flagsSchema = z.object({ active: z.boolean().optional(), featured: z.boolean().optional() });
const deleteCategorySchema = z.object({ moveTo: idSchema.optional() });

const id = (value: unknown) => parseBody(idSchema, value);

/** CRUD de produtos e categorias (montado sob /api/admin, já autenticado). */
export function adminCatalogRoutes({ products, categories, content }: Services): Router {
  const router = Router();

  router.get('/dashboard', (_req, res) => {
    res.json(content.dashboard());
  });

  // Produtos
  router.get('/products', (req, res) => {
    const query = parseBody(listSchema, req.query);
    res.json(products.list({ search: query.q, categoryId: query.categoryId }));
  });
  router.get('/products/:id', (req, res) => {
    res.json(products.get(id(req.params['id'])));
  });
  router.post('/products', (req, res) => {
    res.status(201).json(products.create(req.body));
  });
  router.put('/products/:id', async (req, res) => {
    res.json(await products.update(id(req.params['id']), req.body));
  });
  router.patch('/products/:id', (req, res) => {
    res.json(products.setFlags(id(req.params['id']), parseBody(flagsSchema, req.body)));
  });
  router.delete('/products/:id', async (req, res) => {
    await products.delete(id(req.params['id']));
    res.status(204).end();
  });

  // Categorias
  router.get('/categories', (_req, res) => {
    res.json(categories.list());
  });
  router.post('/categories', (req, res) => {
    res.status(201).json(categories.create(req.body));
  });
  router.put('/categories/:id', (req, res) => {
    res.json(categories.update(id(req.params['id']), req.body));
  });
  router.delete('/categories/:id', (req, res) => {
    const { moveTo } = parseBody(deleteCategorySchema, req.query);
    res.json(categories.delete(id(req.params['id']), moveTo));
  });

  return router;
}
