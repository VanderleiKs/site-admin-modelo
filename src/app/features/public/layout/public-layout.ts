import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SeoService } from '../../../core/seo/seo-service';
import { SiteStore } from '../../../core/site/site-store';
import { SiteFooter } from './site-footer/site-footer';
import { SiteHeader } from './site-header/site-header';

/** Estrutura do site público. As cores da marca vêm do banco e viram variáveis CSS (inclusive no SSR). */
@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex min-h-dvh flex-col',
    '[style.--brand-primary]': 'colors().primary',
    '[style.--brand-secondary]': 'colors().secondary',
    '[style.--brand-accent]': 'colors().accent',
  },
  templateUrl: './public-layout.html',
})
export class PublicLayout {
  protected readonly store = inject(SiteStore);
  protected readonly colors = computed(() => {
    const settings = this.store.settings();
    return {
      primary: settings?.primaryColor ?? null,
      secondary: settings?.secondaryColor ?? null,
      accent: settings?.accentColor ?? null,
    };
  });

  constructor() {
    if (this.store.failed()) {
      const seo = inject(SeoService);
      seo.setStatus(503);
      seo.update({
        title: 'Site temporariamente indisponível',
        description: '',
        path: '/',
        noindex: true,
      });
    }
  }
}
