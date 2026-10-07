import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import type { Product, SiteSettings } from '../../../../../shared/models';
import { ContentGateway } from '../../../../core/content/content-gateway';
import { SeoService } from '../../../../core/seo/seo-service';
import { SiteStore } from '../../../../core/site/site-store';
import { paragraphs } from '../../../../core/utils/format';
import { CardSkeleton } from '../../../../shared/ui/card-skeleton/card-skeleton';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ProductCard } from '../../../../shared/ui/product-card/product-card';
import { StateMessage } from '../../../../shared/ui/state-message/state-message';
import { WhatsappCta } from '../../components/whatsapp-cta/whatsapp-cta';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-home-page',
  imports: [
    RouterLink,
    NgOptimizedImage,
    ProductCard,
    CardSkeleton,
    StateMessage,
    WhatsappCta,
    Icon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-page.html',
})
export class HomePage {
  protected readonly store = inject(SiteStore);
  private readonly content = inject(ContentGateway);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly featured = signal<readonly Product[]>([]);
  protected readonly featuredState = signal<LoadState>('loading');
  protected readonly aboutPreview = computed(() =>
    paragraphs(this.store.settings()?.aboutText).slice(0, 2),
  );

  constructor() {
    const settings = this.store.settings();
    if (settings) this.updateSeo(settings);
    this.loadFeatured();
  }

  protected loadFeatured(): void {
    this.featuredState.set('loading');
    this.content
      .productList({ featured: true, limit: 6 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.featured.set(list.items);
          this.featuredState.set('ready');
        },
        error: () => this.featuredState.set('error'),
      });
  }

  private updateSeo(s: SiteSettings): void {
    this.seo.update({
      title: s.seoTitle,
      description: s.seoDescription,
      path: '/',
      image: s.heroImage?.url,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: s.companyName,
        description: s.seoDescription,
        url: this.seo.absoluteUrl('/'),
        ...(s.heroImage && { image: this.seo.absoluteUrl(s.heroImage.url) }),
        ...(s.phone && { telephone: s.phone }),
        ...(s.email && { email: s.email }),
        ...(s.address && { address: s.address }),
        ...(s.openingHours && { openingHours: s.openingHours }),
        sameAs: [s.instagramUrl, s.facebookUrl].filter(Boolean),
      },
    });
  }
}
