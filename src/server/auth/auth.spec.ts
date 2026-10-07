import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ADMIN, startTestServer, TestClient, type TestServer } from '../testing/test-server';
import { hashPassword, passwordProblem, verifyPassword } from './password';

describe('senhas', () => {
  it('gera hash scrypt com sal e verifica', async () => {
    const hash = await hashPassword('Senha-Forte-123');
    expect(hash).toMatch(/^scrypt\$32768\$8\$3\$/);
    expect(await verifyPassword('Senha-Forte-123', hash)).toBe(true);
    expect(await verifyPassword('senha-forte-123', hash)).toBe(false);
    expect(await hashPassword('Senha-Forte-123')).not.toBe(hash);
  });

  it('exige senha forte', () => {
    expect(passwordProblem('curta')).toMatch(/10 caracteres/);
    expect(passwordProblem('somenteminusculas')).toMatch(/3 tipos/);
    expect(passwordProblem('Senha-Forte-123')).toBeNull();
  });
});

describe('autenticação e autorização (API)', () => {
  let server: TestServer;
  let client: TestClient;

  beforeEach(async () => {
    server = await startTestServer({ LOGIN_MAX_FAILED_ATTEMPTS: '3' });
    client = new TestClient(server.url);
  });
  afterEach(() => server.close());

  it('login define cookie HttpOnly e cookie CSRF; logout invalida a sessão', async () => {
    const response = await client.login();
    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(ADMIN.email);
    const setCookie = response.headers.getSetCookie().join('\n');
    expect(setCookie).toMatch(/sid=[^;]+;.*HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(client.csrf).not.toBe('');

    expect((await client.request('GET', '/api/auth/me')).status).toBe(200);
    expect((await client.request('POST', '/api/auth/logout', {})).status).toBe(204);
    expect((await client.request('GET', '/api/auth/me')).status).toBe(401);
  });

  it('mensagem genérica para e-mail inexistente e senha errada', async () => {
    const wrong = await client.login(ADMIN.email, 'errada');
    const unknown = await client.login('ninguem@teste.local', 'errada');
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  it('bloqueia a conta após tentativas excessivas', async () => {
    for (let i = 0; i < 3; i++) await client.login(ADMIN.email, 'errada');
    expect((await client.login()).status).toBe(429);
  });

  it('limita tentativas por IP', async () => {
    await server.close();
    server = await startTestServer({ LOGIN_MAX_PER_IP: '2' });
    client = new TestClient(server.url);
    await client.login('a@teste.local', 'x');
    await client.login('b@teste.local', 'x');
    expect((await client.login()).status).toBe(429);
  });

  it('login exige JSON (impede login CSRF por formulário)', async () => {
    const response = await fetch(`${server.url}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `email=${ADMIN.email}&password=${ADMIN.password}`,
    });
    expect(response.status).toBe(415);
  });

  it('rotas administrativas exigem sessão', async () => {
    for (const [method, path] of [
      ['GET', '/api/admin/products'],
      ['GET', '/api/admin/dashboard'],
      ['POST', '/api/admin/categories'],
      ['PUT', '/api/admin/settings'],
      ['POST', '/api/admin/media'],
    ]) {
      expect(
        (await client.request(method, path, method === 'GET' ? undefined : {})).status,
        `${method} ${path}`,
      ).toBe(401);
    }
  });

  it('escritas exigem o token CSRF da sessão', async () => {
    await client.login();
    const body = { name: 'Frescos', slug: 'frescos' };
    expect(
      (await client.request('POST', '/api/admin/categories', body, { 'x-xsrf-token': '' })).status,
    ).toBe(403);
    expect(
      (await client.request('POST', '/api/admin/categories', body, { 'x-xsrf-token': 'falso' }))
        .status,
    ).toBe(403);
    expect((await client.request('POST', '/api/admin/categories', body)).status).toBe(201);
  });

  it('troca de senha encerra a sessão e passa a valer a nova senha', async () => {
    await client.login();
    const weak = await client.request('PUT', '/api/auth/password', {
      currentPassword: ADMIN.password,
      newPassword: 'fraca',
    });
    expect(weak.status).toBe(400);
    const ok = await client.request('PUT', '/api/auth/password', {
      currentPassword: ADMIN.password,
      newPassword: 'Nova-Senha-456',
    });
    expect(ok.status).toBe(204);
    expect((await client.request('GET', '/api/auth/me')).status).toBe(401);
    expect((await client.login(ADMIN.email, 'Nova-Senha-456')).status).toBe(200);
  });
});
