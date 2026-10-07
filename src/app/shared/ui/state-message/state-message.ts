import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Estados de vazio e erro das páginas públicas (com botão "Tentar novamente" no erro). */
@Component({
  selector: 'app-state-message',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './state-message.html',
})
export class StateMessage {
  readonly kind = input<'empty' | 'error'>('empty');
  readonly title = input.required<string>();
  readonly message = input('');
  readonly retry = output<void>();
}
