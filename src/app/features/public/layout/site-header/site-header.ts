import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { SiteStore } from '../../../../core/site/site-store';
import { Icon } from '../../../../shared/ui/icon/icon';
import { SiteLogo } from '../site-logo/site-logo';

interface NavItem {
  readonly path: string;
  readonly label: string;
}

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive, SiteLogo, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-header.html',
})
export class SiteHeader {
  protected readonly store = inject(SiteStore);
  protected readonly open = signal(false);
  protected readonly nav: readonly NavItem[] = [
    { path: '/', label: 'Início' },
    { path: '/produtos', label: 'Produtos' },
    { path: '/sobre', label: 'Sobre' },
    { path: '/contato', label: 'Contato' },
  ];

  constructor() {
    // Fecha o menu do celular após navegar.
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.open.set(false));
  }

  protected toggle(): void {
    this.open.update((value) => !value);
  }
}
