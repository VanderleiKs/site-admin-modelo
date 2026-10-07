import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteStore } from '../../../../core/site/site-store';
import { Icon } from '../../../../shared/ui/icon/icon';

/** Chamada para contato/pedido pelo WhatsApp. */
@Component({
  selector: 'app-whatsapp-cta',
  imports: [Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './whatsapp-cta.html',
})
export class WhatsappCta {
  protected readonly store = inject(SiteStore);
}
