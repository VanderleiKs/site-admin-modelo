/**
 * Limite simples de tentativas de login por IP (janela fixa de 15 minutos, em memória).
 * Complementa o bloqueio por conta feito no AuthService.
 */
export class LoginLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();
  private static readonly WINDOW_MS = 15 * 60_000;

  constructor(private readonly maxPerWindow: number) {}

  /** Registra a tentativa e retorna false se o IP excedeu o limite. */
  allow(ip: string): boolean {
    const now = Date.now();
    if (this.hits.size > 10_000) this.prune(now);
    const entry = this.hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(ip, { count: 1, resetAt: now + LoginLimiter.WINDOW_MS });
      return true;
    }
    entry.count += 1;
    return entry.count <= this.maxPerWindow;
  }

  private prune(now: number): void {
    for (const [ip, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(ip);
  }
}
