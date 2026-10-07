import express, { Router } from 'express';
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from '../../shared/models';
import { HttpError } from '../http/errors';
import { idSchema, parseBody } from '../http/validation';
import type { Services } from '../services';

/**
 * Upload de imagens: o painel envia o arquivo como corpo binário (Content-Type da imagem),
 * sem multipart — dispensa bibliotecas de parsing e permite barra de progresso.
 */
export function mediaRoutes({ media }: Services): Router {
  const router = Router();

  router.post('/', express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }), async (req, res) => {
    const contentType = req.get('content-type')?.split(';')[0]?.trim() ?? '';
    if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(contentType)) {
      throw new HttpError(415, 'Formato não suportado. Envie JPEG, PNG ou WebP.');
    }
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const name = decodeURIComponent(req.get('x-file-name') ?? 'imagem');
    const alt = req.get('x-image-alt') ? decodeURIComponent(req.get('x-image-alt')!) : null;
    res.status(201).json(await media.upload(body, name, alt));
  });

  router.delete('/:id', async (req, res) => {
    await media.delete(parseBody(idSchema, req.params['id']));
    res.status(204).end();
  });

  return router;
}
