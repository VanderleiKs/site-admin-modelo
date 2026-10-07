import {
  ChangeDetectionStrategy,
  Component,
  effect,
  type ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth-store';
import { ConfirmService } from '../../../core/ui/confirm-service';
import { ToastService } from '../../../core/ui/toast-service';
import { Icon } from '../../../shared/ui/icon/icon';

interface NavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: string;
  readonly exact: boolean;
}

/** Estrutura do painel: menu lateral, notificações e diálogo de confirmação. */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-dvh bg-stone-100 text-stone-900' },
  templateUrl: './admin-layout.html',
})
export class AdminLayout {
  protected readonly auth = inject(AuthStore);
  protected readonly toasts = inject(ToastService);
  protected readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly menuOpen = signal(false);
  protected readonly nav: readonly NavItem[] = [
    { path: '/admin', label: 'Visão geral', icon: 'home', exact: true },
    { path: '/admin/produtos', label: 'Produtos', icon: 'wheel', exact: false },
    { path: '/admin/categorias', label: 'Categorias', icon: 'tag', exact: false },
    { path: '/admin/configuracoes', label: 'Configurações do site', icon: 'cog', exact: false },
    { path: '/admin/conta', label: 'Minha conta', icon: 'edit', exact: false },
  ];

  constructor() {
    // Abre/fecha o <dialog> nativo conforme o pedido de confirmação.
    effect(() => {
      const dialog = this.dialog().nativeElement;
      const pending = this.confirm.request() !== null;
      if (pending && !dialog.open) dialog.showModal();
      if (!pending && dialog.open) dialog.close();
    });
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuOpen.set(false));
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected logout(): void {
    this.auth.logout().subscribe(() => void this.router.navigate(['/admin/login']));
  }
}
