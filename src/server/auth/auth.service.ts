import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { AuthUser } from '../../shared/models';
import type { ServerConfig } from '../config/env';
import { type Database, nowIso } from '../db/database';
import { HttpError } from '../http/errors';
import { hashPassword, passwordProblem, verifyPassword } from './password';

export interface Session {
  readonly user: AuthUser;
  readonly csrfToken: string;
}

export interface NewSession extends Session {
  readonly token: string;
}

const INVALID_CREDENTIALS = 'E-mail ou senha inválidos.';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/**
 * Usuários do painel e sessões. A sessão é um token aleatório guardado em cookie HttpOnly;
 * o banco armazena apenas o hash SHA-256 do token.
 */
export class AuthService {
  private dummyHash?: Promise<string>;

  constructor(
    private readonly db: Database,
    private readonly config: ServerConfig,
  ) {}

  async login(emailInput: string, password: string): Promise<NewSession> {
    const email = emailInput.trim().toLowerCase();
    const user = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      // Equaliza o tempo de resposta para não revelar se o e-mail existe.
      this.dummyHash ??= hashPassword(randomUUID());
      await verifyPassword(password, await this.dummyHash);
      throw new HttpError(401, INVALID_CREDENTIALS);
    }

    const lockedUntil = user['locked_until'] ? Date.parse(String(user['locked_until'])) : 0;
    if (lockedUntil > Date.now()) {
      throw new HttpError(429, 'Muitas tentativas de login. Aguarde alguns minutos.');
    }

    if (!(await verifyPassword(password, String(user['password_hash'])))) {
      const attempts = Number(user['failed_attempts']) + 1;
      const lock = attempts >= this.config.login.maxFailedAttempts;
      this.db
        .prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?')
        .run(
          lock ? 0 : attempts,
          lock ? new Date(Date.now() + this.config.login.lockMinutes * 60_000).toISOString() : null,
          String(user['id']),
        );
      throw new HttpError(401, INVALID_CREDENTIALS);
    }

    this.db
      .prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?')
      .run(String(user['id']));
    return this.createSession({
      id: String(user['id']),
      email: String(user['email']),
      name: String(user['name']),
    });
  }

  private createSession(user: AuthUser): NewSession {
    const token = randomBytes(32).toString('base64url');
    const csrfToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.config.sessionHours * 3_600_000).toISOString();
    this.db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(nowIso());
    this.db
      .prepare(
        'INSERT INTO sessions (id, token_hash, csrf_token, user_id, expires_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(randomUUID(), sha256(token), csrfToken, user.id, expiresAt);
    return { token, csrfToken, user };
  }

  findSession(token: string | undefined): Session | null {
    if (!token || token.length > 100) return null;
    const row = this.db
      .prepare(
        `SELECT s.csrf_token, s.expires_at, u.id, u.email, u.name
           FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = ?`,
      )
      .get(sha256(token));
    if (!row || Date.parse(String(row['expires_at'])) <= Date.now()) return null;
    return {
      csrfToken: String(row['csrf_token']),
      user: { id: String(row['id']), email: String(row['email']), name: String(row['name']) },
    };
  }

  logout(token: string | undefined): void {
    if (token) this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
  }

  async changePassword(userId: string, current: string, next: string): Promise<void> {
    const row = this.db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);
    if (!row || !(await verifyPassword(current, String(row['password_hash'])))) {
      throw new HttpError(400, 'Senha atual incorreta.', [
        { field: 'currentPassword', message: 'Senha atual incorreta.' },
      ]);
    }
    const problem = passwordProblem(next);
    if (problem) throw new HttpError(400, problem, [{ field: 'newPassword', message: problem }]);
    this.db
      .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(await hashPassword(next), userId);
    // Encerra as outras sessões do usuário.
    this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }

  /**
   * Cria o administrador a partir de ADMIN_EMAIL/ADMIN_PASSWORD quando ainda não existe
   * nenhum usuário (ou redefine a senha se ADMIN_RESET_PASSWORD=true).
   * Não há usuário/senha padrão no código.
   */
  async ensureAdmin(): Promise<void> {
    const { email, password, name, resetPassword } = this.config.admin;
    const count = Number(this.db.prepare('SELECT COUNT(*) AS n FROM users').get()?.['n']);
    if (!email || !password) {
      if (count === 0)
        console.warn(
          '[auth] Nenhum administrador. Defina ADMIN_EMAIL e ADMIN_PASSWORD no .env e reinicie.',
        );
      return;
    }
    const problem = passwordProblem(password);
    if (problem) throw new Error(`ADMIN_PASSWORD inválida: ${problem}`);

    const existing = this.db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing && resetPassword) {
      this.db
        .prepare(
          'UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?',
        )
        .run(await hashPassword(password), String(existing['id']));
      this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(String(existing['id']));
      console.warn(
        `[auth] Senha de ${email} redefinida. Remova ADMIN_RESET_PASSWORD e ADMIN_PASSWORD do .env.`,
      );
    } else if (!existing && count === 0) {
      this.db
        .prepare('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)')
        .run(randomUUID(), email, name, await hashPassword(password));
      console.warn(`[auth] Administrador ${email} criado. Remova ADMIN_PASSWORD do .env.`);
    }
  }
}
