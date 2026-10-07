import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { DashboardSummary } from '../../../../../shared/models';
import { AdminApi } from '../../../../core/admin-api/admin-api';
import { AuthStore } from '../../../../core/auth/auth-store';
import { errorMessage } from '../../../../core/utils/api-error';
import { Icon } from '../../../../shared/ui/icon/icon';

/** Visão geral com contagens reais do banco (sem indicadores inventados). */
@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, DatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
  protected readonly auth = inject(AuthStore);
  private readonly api = inject(AdminApi);

  protected readonly summary = signal<DashboardSummary | null>(null);
  protected readonly error = signal('');
  protected readonly cards = computed(() => {
    const s = this.summary();
    if (!s) return [];
    return [
      { label: 'Produtos', value: s.productCount, hint: `${s.activeProductCount} ativos no site` },
      { label: 'Categorias', value: s.categoryCount, hint: 'Filtros do catálogo' },
      { label: 'Em destaque', value: s.featuredCount, hint: 'Exibidos na página inicial' },
      {
        label: 'Sem imagem',
        value: s.productsWithoutImage,
        hint: s.productsWithoutImage ? 'Adicione fotos' : 'Todos com imagem',
      },
    ];
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.error.set('');
    this.api.dashboard().subscribe({
      next: (summary) => this.summary.set(summary),
      error: (error: unknown) => this.error.set(errorMessage(error)),
    });
  }
}
