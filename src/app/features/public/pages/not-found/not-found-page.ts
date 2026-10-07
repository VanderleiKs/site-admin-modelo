import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../../core/seo/seo-service';
import { SiteStore } from '../../../../core/site/site-store';

/** Página 404 — responde com status HTTP 404 real no SSR (não um "soft 404"). */
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './not-found-page.html',
})
export class NotFoundPage {
  constructor() {
    const seo = inject(SeoService);
    seo.setStatus(404);
    seo.update({
      title: `Página não encontrada — ${inject(SiteStore).companyName()}`,
      description: 'A página procurada não existe.',
      path: '/404',
      noindex: true,
    });
  }
}
