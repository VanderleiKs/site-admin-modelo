import { Injectable, signal } from '@angular/core';

export interface Toast {
  readonly id: number;
  readonly kind: 'success' | 'error';
  readonly text: string;
}

/** Mensagens rápidas de sucesso/erro exibidas pelo layout do painel. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private sequence = 0;
  readonly toasts = signal<readonly Toast[]>([]);

  success(text: string): void {
    this.push('success', text, 4000);
  }

  error(text: string): void {
    this.push('error', text, 7000);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((toast) => toast.id !== id));
  }

  private push(kind: Toast['kind'], text: string, duration: number): void {
    const id = ++this.sequence;
    this.toasts.update((list) => [...list, { id, kind, text }]);
    setTimeout(() => this.dismiss(id), duration);
  }
}
