import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { AVAILABILITY_LABELS, type Product } from '../../../../../shared/models';
import { AdminApi } from '../../../../core/admin-api/admin-api';
import { ConfirmService } from '../../../../core/ui/confirm-service';
import { ToastService } from '../../../../core/ui/toast-service';
import { errorMessage } from '../../../../core/utils/api-error';
import { formatPrice } from '../../../../core/utils/format';
import { Icon } from '../../../../shared/ui/icon/icon';

@Component({
  selector: 'app-product-list-page',
  imports: [RouterLink, ReactiveFormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-list-page.html',
})
export class ProductListPage {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly categoryId = new FormControl('', { nonNullable: true });
  protected readonly categories = toSignal(this.api.categories(), { initialValue: [] });

  protected readonly products = signal<readonly Product[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  /** Linhas já formatadas para o template (sem chamadas de método no HTML). */
  protected readonly rows = computed(() =>
    this.products().map((product) => ({
      product,
      details: [
        product.category.name,
        formatPrice(product.priceCents, product.priceUnit) ?? 'Sob consulta',
        AVAILABILITY_LABELS[product.availability],
        ...(product.mainImage ? [] : ['sem imagem']),
      ].join(' · '),
    })),
  );

  constructor() {
    combineLatest([
      this.search.valueChanges.pipe(startWith(''), debounceTime(250), distinctUntilChanged()),
      this.categoryId.valueChanges.pipe(startWith('')),
    ])
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set('');
        }),
        switchMap(([q, categoryId]) =>
          this.api.products({ q: q.trim(), categoryId }).pipe(
            catchError((error: unknown) => {
              this.error.set(errorMessage(error, 'Não foi possível carregar os produtos.'));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((products) => {
        if (products) this.products.set(products);
        this.loading.set(false);
      });
  }

  protected reload(): void {
    this.api
      .products({ q: this.search.value.trim(), categoryId: this.categoryId.value })
      .subscribe({
        next: (products) => {
          this.products.set(products);
          this.error.set('');
        },
        error: (error: unknown) => this.error.set(errorMessage(error)),
      });
  }

  protected toggle(product: Product, flag: 'active' | 'featured'): void {
    this.busy.set(true);
    this.api.setProductFlags(product.id, { [flag]: !product[flag] }).subscribe({
      next: (updated) => {
        this.products.update((list) => list.map((p) => (p.id === updated.id ? updated : p)));
        this.busy.set(false);
        this.toast.success(
          flag === 'active'
            ? `"${updated.name}" ${updated.active ? 'publicado no site' : 'removido do site'}.`
            : `"${updated.name}" ${updated.featured ? 'adicionado aos' : 'removido dos'} destaques.`,
        );
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.toast.error(errorMessage(error));
      },
    });
  }

  protected async remove(product: Product): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Excluir produto?',
      message: `"${product.name}" será removido definitivamente. Para apenas ocultá-lo do site, desative-o.`,
      confirmLabel: 'Excluir',
    });
    if (!confirmed) return;
    this.busy.set(true);
    this.api.deleteProduct(product.id).subscribe({
      next: () => {
        this.products.update((list) => list.filter((p) => p.id !== product.id));
        this.busy.set(false);
        this.toast.success(`"${product.name}" excluído.`);
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.toast.error(errorMessage(error));
      },
    });
  }
}
