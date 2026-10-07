import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, type Observable, of, tap } from 'rxjs';
import type { PublicSite } from '../../../shared/models';
import { ContentGateway } from '../content/content-gateway';
import { whatsappLink } from '../utils/format';

/**
 * Configurações do site vindas do banco: fonte única dos dados do cliente
 * (nome, cores, textos, contatos). Nenhum componente tem esses dados fixos.
 */
@Injectable({ providedIn: 'root' })
export class SiteStore {
  private readonly gateway = inject(ContentGateway);
  private readonly state = signal<PublicSite | null>(null);

  readonly failed = signal(false);
  readonly settings = computed(() => this.state()?.settings ?? null);
  readonly categories = computed(() => this.state()?.categories ?? []);
  readonly companyName = computed(() => this.settings()?.companyName ?? '');
  readonly whatsappUrl = computed(() => {
    const s = this.settings();
    return s?.whatsapp ? whatsappLink(s.whatsapp, s.whatsappMessage) : null;
  });

  /** Carrega uma vez por página (navegador) ou por requisição (servidor). */
  load(): Observable<boolean> {
    if (this.state()) return of(true);
    return this.gateway.site().pipe(
      tap((site) => this.state.set(site)),
      map(() => true),
      catchError(() => {
        this.failed.set(true);
        return of(false);
      }),
    );
  }
}
