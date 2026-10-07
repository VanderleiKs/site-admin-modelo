import type { CookieOptions, Request, Response } from 'express';

/** Nome lido automaticamente pelo HttpClient do Angular para o cabeçalho X-XSRF-TOKEN. */
export const CSRF_COOKIE = 'XSRF-TOKEN';
export const CSRF_HEADER = 'x-xsrf-token';

/** Com HTTPS, o prefixo __Host- obriga Secure, Path=/ e ausência de Domain. */
export const sessionCookieName = (secure: boolean) => (secure ? '__Host-sid' : 'sid');

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export function setSessionCookies(
  res: Response,
  secure: boolean,
  token: string,
  csrf: string,
  hours: number,
): void {
  const base: CookieOptions = { secure, sameSite: 'lax', path: '/', maxAge: hours * 3_600_000 };
  res.cookie(sessionCookieName(secure), token, { ...base, httpOnly: true });
  res.cookie(CSRF_COOKIE, csrf, { ...base, httpOnly: false });
}

export function clearSessionCookies(res: Response, secure: boolean): void {
  res.clearCookie(sessionCookieName(secure), {
    secure,
    sameSite: 'lax',
    path: '/',
    httpOnly: true,
  });
  res.clearCookie(CSRF_COOKIE, { secure, sameSite: 'lax', path: '/' });
}
