import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../../core/seo/seo-service';
import { SiteStore } from '../../../../core/site/site-store';
import { Icon } from '../../../../shared/ui/icon/icon';

@Component({
  selector: 'app-contact-page',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-page.html',
})
export class ContactPage {
  protected readonly store = inject(SiteStore);
  protected readonly phoneDigits = computed(() =>
    (this.store.settings()?.phone ?? '').replace(/[^\d+]/g, ''),
  );
  protected readonly mapsUrl = computed(
    () =>
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.store.settings()?.address ?? '')}`,
  );

  constructor() {
    const company = this.store.companyName();
    inject(SeoService).update({
      title: `Contato — ${company}`,
      description: `Fale com a ${company}: WhatsApp, telefone, e-mail, endereço e horário de atendimento.`,
      path: '/contato',
    });
  }
}
