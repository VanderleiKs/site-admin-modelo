import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../../core/seo/seo-service';
import { SiteStore } from '../../../../core/site/site-store';
import { paragraphs } from '../../../../core/utils/format';
import { Icon } from '../../../../shared/ui/icon/icon';
import { WhatsappCta } from '../../components/whatsapp-cta/whatsapp-cta';

@Component({
  selector: 'app-about-page',
  imports: [NgOptimizedImage, RouterLink, Icon, WhatsappCta],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './about-page.html',
})
export class AboutPage {
  protected readonly store = inject(SiteStore);
  protected readonly text = computed(() => paragraphs(this.store.settings()?.aboutText));

  constructor() {
    const settings = this.store.settings();
    if (!settings) return;
    inject(SeoService).update({
      title: `Sobre — ${settings.companyName}`,
      description: paragraphs(settings.aboutText)[0]?.slice(0, 160) ?? settings.seoDescription,
      path: '/sobre',
      image: settings.aboutImage?.url ?? settings.heroImage?.url,
      type: 'article',
    });
  }
}
