import { resolve } from 'node:path';

/**
 * Configuração do servidor lida das variáveis de ambiente (arquivo .env na raiz em
 * desenvolvimento). Nenhum valor aqui é enviado ao navegador.
 */
export interface ServerConfig {
  readonly isProduction: boolean;
  readonly port: number;
  readonly host: string;
  readonly dataDir: string;
  readonly databaseFile: string;
  readonly uploadsDir: string;
  readonly publicSiteUrl: string;
  readonly allowedHosts: readonly string[];
  readonly trustProxy: string | number | boolean;
  readonly cookieSecure: boolean;
  readonly sessionHours: number;
  readonly seedDemo: boolean;
  readonly admin: {
    readonly email: string;
    readonly password: string;
    readonly name: string;
    readonly resetPassword: boolean;
  };
  readonly login: {
    readonly maxFailedAttempts: number;
    readonly lockMinutes: number;
    readonly maxPerIpPer15Min: number;
  };
}

type Env = Readonly<Record<string, string | undefined>>;

function read(env: Env, name: string, fallback = ''): string {
  return env[name]?.trim() || fallback;
}

function readInt(env: Env, name: string, fallback: number): number {
  const raw = read(env, name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Variável ${name} deve ser um número inteiro não negativo.`);
  }
  return value;
}

function readBool(env: Env, name: string, fallback: boolean): boolean {
  const raw = read(env, name).toLowerCase();
  if (!raw) return fallback;
  return ['1', 'true', 'sim', 'yes'].includes(raw);
}

function parseTrustProxy(raw: string): string | number | boolean {
  if (!raw) return 'loopback';
  if (raw === 'true' || raw === 'false') return raw === 'true';
  return /^\d+$/.test(raw) ? Number(raw) : raw;
}

export function loadConfig(env: Env = process.env): ServerConfig {
  const isProduction = read(env, 'NODE_ENV') === 'production';
  const dataDir = resolve(read(env, 'DATA_DIR', './data'));
  const publicSiteUrl = read(env, 'PUBLIC_SITE_URL').replace(/\/+$/, '');
  const allowedHosts = read(env, 'ALLOWED_HOSTS')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);
  if (publicSiteUrl) allowedHosts.push(new URL(publicSiteUrl).hostname);

  const cookieSecureRaw = read(env, 'COOKIE_SECURE', 'auto');

  return {
    isProduction,
    port: readInt(env, 'PORT', 4000),
    host: read(env, 'HOST', '0.0.0.0'),
    dataDir,
    databaseFile: resolve(dataDir, 'site.db'),
    uploadsDir: resolve(dataDir, 'uploads'),
    publicSiteUrl,
    allowedHosts,
    trustProxy: parseTrustProxy(read(env, 'TRUST_PROXY')),
    cookieSecure:
      cookieSecureRaw === 'auto' ? isProduction : readBool(env, 'COOKIE_SECURE', isProduction),
    sessionHours: readInt(env, 'SESSION_HOURS', 12),
    seedDemo: readBool(env, 'SEED_DEMO', !isProduction),
    admin: {
      email: read(env, 'ADMIN_EMAIL').toLowerCase(),
      password: env['ADMIN_PASSWORD'] ?? '',
      name: read(env, 'ADMIN_NAME', 'Administrador'),
      resetPassword: readBool(env, 'ADMIN_RESET_PASSWORD', false),
    },
    login: {
      maxFailedAttempts: readInt(env, 'LOGIN_MAX_FAILED_ATTEMPTS', 5),
      lockMinutes: readInt(env, 'LOGIN_LOCK_MINUTES', 15),
      maxPerIpPer15Min: readInt(env, 'LOGIN_MAX_PER_IP', 20),
    },
  };
}
