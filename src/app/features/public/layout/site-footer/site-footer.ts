import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteStore } from '../../../../core/site/site-store';
import { Icon } from '../../../../shared/ui/icon/icon';
import { SiteLogo } from '../site-logo/site-logo';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, SiteLogo, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-footer.html',
})
export class SiteFooter {
  protected readonly store = inject(SiteStore);
  protected readonly year = new Date().getFullYear();
  protected readonly phoneDigits = computed(() =>
    (this.store.settings()?.phone ?? '').replace(/[^\d+]/g, ''),
  );
  protected readonly socials = computed(() => {
    const settings = this.store.settings();
    const links = [
      { name: 'instagram', label: 'Instagram', url: settings?.instagramUrl },
      { name: 'facebook', label: 'Facebook', url: settings?.facebookUrl },
    ];
    return links.filter((link): link is { name: string; label: string; url: string } => !!link.url);
  });
}
