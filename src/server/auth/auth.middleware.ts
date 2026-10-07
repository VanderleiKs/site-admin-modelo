import { timingSafeEqual } from 'node:crypto';
import type { Request, RequestHandler } from 'express';
import type { AuthUser } from '../../shared/models';
import { HttpError } from '../http/errors';
import type { Services } from '../services';
import { CSRF_HEADER, readCookie, sessionCookieName } from './cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const sameToken = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Usuário autenticado anexado à requisição por `requireAuth`. */
export function currentUser(req: Request): AuthUser {
  const user = (req as Request & { user?: AuthUser }).user;
  if (!user) throw new HttpError(401, 'Sessão expirada. Entre novamente.');
  return user;
}

/**
 * Exige sessão válida. Em métodos que alteram dados, exige também o cabeçalho
 * X-XSRF-TOKEN igual ao token CSRF da sessão (proteção contra CSRF com cookies).
 */
export function requireAuth(services: Services): RequestHandler {
  return (req, _res, next) => {
    const token = readCookie(req, sessionCookieName(services.config.cookieSecure));
    const session = services.auth.findSession(token);
    if (!session) return next(new HttpError(401, 'Sessão expirada. Entre novamente.'));
    if (!SAFE_METHODS.has(req.method)) {
      const header = req.get(CSRF_HEADER) ?? '';
      if (!sameToken(header, session.csrfToken)) {
        return next(new HttpError(403, 'Token de segurança inválido. Recarregue a página.'));
      }
    }
    (req as Request & { user?: AuthUser }).user = session.user;
    next();
  };
}
