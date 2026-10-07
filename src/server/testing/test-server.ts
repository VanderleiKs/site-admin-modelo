import express from 'express';
import { mkdtempSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApiRouter } from '../api';
import { loadConfig } from '../config/env';
import { openDatabase } from '../db/database';
import { createServices, type Services } from '../services';

export const ADMIN = { email: 'admin@teste.local', password: 'Senha-Teste-123' };

export interface TestServer {
  readonly services: Services;
  readonly url: string;
  close(): Promise<void>;
}

/** API real com banco SQLite em memória e uploads em diretório temporário. */
export async function startTestServer(env: Record<string, string> = {}): Promise<TestServer> {
  const dataDir = mkdtempSync(join(tmpdir(), 'site-test-'));
  const config = loadConfig({
    DATA_DIR: dataDir,
    ADMIN_EMAIL: ADMIN.email,
    ADMIN_PASSWORD: ADMIN.password,
    SEED_DEMO: 'false',
    ...env,
  });
  const services = createServices(config, openDatabase(':memory:'));
  await services.auth.ensureAdmin();

  const app = express();
  app.set('trust proxy', 'loopback');
  app.use('/api', createApiRouter(services));
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    services,
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

/** Cliente HTTP mínimo que guarda os cookies da sessão e envia o cabeçalho CSRF. */
export class TestClient {
  private cookies = new Map<string, string>();

  constructor(private readonly baseUrl: string) {}

  get csrf(): string {
    return this.cookies.get('XSRF-TOKEN') ?? '';
  }

  async request(
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const isBuffer = body instanceof Uint8Array;
    const response = await fetch(this.baseUrl + path, {
      method,
      headers: {
        ...(body !== undefined && !isBuffer ? { 'content-type': 'application/json' } : {}),
        cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '),
        'x-xsrf-token': this.csrf,
        ...headers,
      },
      body: body === undefined ? undefined : isBuffer ? new Uint8Array(body) : JSON.stringify(body),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const [name, value] = pair.split('=');
      if (value) this.cookies.set(name, value);
      else this.cookies.delete(name);
    }
    const text = await response.text();
    return {
      status: response.status,
      headers: response.headers,
      body: text ? JSON.parse(text) : null,
    };
  }

  login(email = ADMIN.email, password = ADMIN.password) {
    return this.request('POST', '/api/auth/login', { email, password });
  }
}

/** PNG válido mínimo (1x1). */
export const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
