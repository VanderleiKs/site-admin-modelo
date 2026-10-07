import { Router } from 'express';
import type { Services } from '../services';

export function settingsRoutes({ settings }: Services): Router {
  const router = Router();
  router.get('/', (_req, res) => {
    res.json(settings.get());
  });
  router.put('/', async (req, res) => {
    res.json(await settings.update(req.body));
  });
  return router;
}
