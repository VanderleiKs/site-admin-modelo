import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map, Subscription } from 'rxjs';
import { AVAILABILITY_LABELS, type ImageRef, type Product } from '../../../../../shared/models';
import { ContentGateway } from '../../../../core/content/content-gateway';
import { SeoService } from '../../../../core/seo/seo-service';
import { SiteStore } from '../../../../core/site/site-store';
import { formatPrice, paragraphs, whatsappLink } from '../../../../core/utils/format';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ProductCard } from '../../../../shared/ui/product-card/product-card';
import { StateMessage } from '../../../../shared/ui/state-message/state-message';
import { NotFoundPage } from '../not-found/not-found-page';

type LoadState = 'loading' | 'ready' | 'notfound' | 'error';

const SCHEMA_AVAILABILITY = {
  IN_STOCK: 'https://schema.org/InStock',
  MADE_TO_ORDER: 'https://schema.org/PreOrder',
  OUT_OF_STOCK: 'https://schema.org/OutOfStock',
} as const;

/** Página de produto (/produtos/:slug) com galeria, pedido via WhatsApp e dados estruturados. */
@Component({
  selector: 'app-product-detail-page',
  imports: [RouterLink, NgOptimizedImage, Icon, ProductCard, StateMessage, NotFoundPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-detail-page.html',
})
export class ProductDetailPage {
  private readonly content = inject(ContentGateway);
  private readonly seo = inject(SeoService);
  private readonly store = inject(SiteStore);

  protected readonly slug = signal('');
  protected readonly product = signal<Product | null>(null);
  protected readonly related = signal<readonly Product[]>([]);
  protected readonly state = signal<LoadState>('loading');
  protected readonly selectedIndex = signal(0);
  private requests = new Subscription();

  protected readonly images = computed<readonly ImageRef[]>(() => {
    const product = this.product();
    if (!product) return [];
    return [
      ...(product.mainImage ? [product.mainImage] : []),
      ...product.gallery.filter((g) => g.id !== product.mainImage?.id),
    ];
  });
  protected readonly current = computed(() => this.images()[this.selectedIndex()] ?? null);
  protected readonly price = computed(() =>
    formatPrice(this.product()?.priceCents, this.product()?.priceUnit),
  );
  protected readonly availability = computed(() => {
    const product = this.product();
    return product ? AVAILABILITY_LABELS[product.availability] : '';
  });
  protected readonly description = computed(() => paragraphs(this.product()?.description));
  protected readonly orderUrl = computed(() => {
    const whatsapp = this.store.settings()?.whatsapp;
    const product = this.product();
    if (!whatsapp || !product) return null;
    const url = this.seo.absoluteUrl(`/produtos/${product.slug}`);
    return whatsappLink(whatsapp, `Olá! Tenho interesse no produto "${product.name}". ${url}`);
  });

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(
        map((params) => params.get('slug') ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((slug) => this.load(slug));
  }

  protected load(slug: string): void {
    this.slug.set(slug);
    this.state.set('loading');
    this.selectedIndex.set(0);
    this.related.set([]);
    this.requests.unsubscribe();
    this.requests = new Subscription();
    this.requests.add(
      this.content.product(slug).subscribe({
        next: (product) => {
          this.product.set(product);
          if (!product) {
            // NotFoundPage define o status 404 da resposta SSR.
            this.state.set('notfound');
            return;
          }
          this.state.set('ready');
          this.updateSeo(product);
          this.loadRelated(product);
        },
        error: () => {
          this.state.set('error');
          this.seo.setStatus(503);
        },
      }),
    );
  }

  private loadRelated(product: Product): void {
    this.requests.add(
      this.content.productList({ category: product.category.slug }).subscribe({
        next: (list) => this.related.set(list.items.filter((p) => p.id !== product.id).slice(0, 3)),
        error: () => this.related.set([]),
      }),
    );
  }

  private updateSeo(product: Product): void {
    const company = this.store.companyName();
    const url = this.seo.absoluteUrl(`/produtos/${product.slug}`);
    this.seo.update({
      title: `${product.name} — ${company}`,
      description: product.shortDescription,
      path: `/produtos/${product.slug}`,
      image: product.mainImage?.url,
      type: 'product',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.shortDescription,
        url,
        category: product.category.name,
        brand: { '@type': 'Brand', name: company },
        ...(product.mainImage && {
          image: this.images().map((image) => this.seo.absoluteUrl(image.url)),
        }),
        ...(product.priceCents !== null && {
          offers: {
            '@type': 'Offer',
            priceCurrency: 'BRL',
            price: (product.priceCents / 100).toFixed(2),
            availability: SCHEMA_AVAILABILITY[product.availability],
            url,
          },
        }),
      },
    });
  }
}
