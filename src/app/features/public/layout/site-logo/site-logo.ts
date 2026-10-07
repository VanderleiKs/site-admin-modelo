import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { SiteStore } from '../../../../core/site/site-store';

/** Logotipo enviado pelo painel ou, na falta dele, o nome da empresa com um ícone. */
@Component({
  selector: 'app-site-logo',
  imports: [NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-logo.html',
})
export class SiteLogo {
  protected readonly store = inject(SiteStore);
  /** Versão clara, para fundos escuros (rodapé). */
  readonly light = input(false);
}
