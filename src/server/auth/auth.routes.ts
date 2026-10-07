import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../http/errors';
import { parseBody } from '../http/validation';
import type { Services } from '../services';
import { currentUser, requireAuth } from './auth.middleware';
import { clearSessionCookies, readCookie, sessionCookieName, setSessionCookies } from './cookies';

const loginSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.').max(254),
  password: z.string().min(1, 'Informe a senha.').max(200),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual.').max(200),
  newPassword: z.string().max(200),
});

export function authRoutes(services: Services): Router {
  const router = Router();
  const { auth, config, loginLimiter } = services;

  router.post('/login', async (req, res) => {
    // JSON obrigatório: formulários de outros sites não conseguem enviar (login CSRF).
    if (!req.is('application/json')) throw new HttpError(415, 'Envie os dados em JSON.');
    if (!loginLimiter.allow(req.ip ?? 'desconhecido')) {
      throw new HttpError(429, 'Muitas tentativas de login. Aguarde alguns minutos.');
    }
    const { email, password } = parseBody(loginSchema, req.body);
    const session = await auth.login(email, password);
    setSessionCookies(
      res,
      config.cookieSecure,
      session.token,
      session.csrfToken,
      config.sessionHours,
    );
    res.json({ user: session.user });
  });

  router.post('/logout', requireAuth(services), (req, res) => {
    auth.logout(readCookie(req, sessionCookieName(config.cookieSecure)));
    clearSessionCookies(res, config.cookieSecure);
    res.status(204).end();
  });

  router.get('/me', requireAuth(services), (req, res) => {
    res.json({ user: currentUser(req) });
  });

  router.put('/password', requireAuth(services), async (req, res) => {
    const body = parseBody(passwordSchema, req.body);
    await auth.changePassword(currentUser(req).id, body.currentPassword, body.newPassword);
    clearSessionCookies(res, config.cookieSecure);
    res.status(204).end();
  });

  return router;
}
