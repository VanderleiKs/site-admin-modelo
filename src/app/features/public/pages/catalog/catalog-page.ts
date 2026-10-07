import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map, type Subscription } from 'rxjs';
import type { Category, Product } from '../../../../../shared/models';
import { ContentGateway } from '../../../../core/content/content-gateway';
import { SeoService } from '../../../../core/seo/seo-service';
import { SiteStore } from '../../../../core/site/site-store';
import { CardSkeleton } from '../../../../shared/ui/card-skeleton/card-skeleton';
import { ProductCard } from '../../../../shared/ui/product-card/product-card';
import { StateMessage } from '../../../../shared/ui/state-message/state-message';

type LoadState = 'loading' | 'ready' | 'error' | 'notfound';

/** Catálogo com filtro por categoria (?categoria=slug). */
@Component({
  selector: 'app-catalog-page',
  imports: [RouterLink, ProductCard, CardSkeleton, StateMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalog-page.html',
})
export class CatalogPage {
  protected readonly store = inject(SiteStore);
  private readonly content = inject(ContentGateway);
  private readonly seo = inject(SeoService);

  protected readonly selected = signal<string | null>(null);
  protected readonly category = signal<Category | null>(null);
  protected readonly products = signal<readonly Product[]>([]);
  protected readonly state = signal<LoadState>('loading');
  private request?: Subscription;

  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(
        map((params) => params.get('categoria')),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((slug) => this.load(slug));
  }

  protected load(slug: string | null): void {
    this.selected.set(slug);
    this.state.set('loading');
    this.request?.unsubscribe();
    this.request = this.content.productList({ category: slug }).subscribe({
      next: (list) => {
        const notFound = !!slug && !list.category;
        this.products.set(list.items);
        this.category.set(list.category);
        this.state.set(notFound ? 'notfound' : 'ready');
        this.updateSeo(slug, list.category, notFound);
      },
      error: () => {
        this.state.set('error');
        this.seo.setStatus(503);
      },
    });
  }

  private updateSeo(slug: string | null, category: Category | null, notFound: boolean): void {
    const company = this.store.companyName();
    if (notFound) this.seo.setStatus(404);
    this.seo.update({
      title: category ? `${category.name} — ${company}` : `Produtos — ${company}`,
      description:
        category?.description ??
        `Catálogo de produtos da ${company}. Veja detalhes e faça seu pedido.`,
      path: slug && category ? `/produtos?categoria=${encodeURIComponent(slug)}` : '/produtos',
      noindex: notFound,
    });
  }
}
