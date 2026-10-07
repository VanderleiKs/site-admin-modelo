import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Esqueleto exibido enquanto os produtos carregam. */
@Component({
  selector: 'app-card-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card-skeleton.html',
})
export class CardSkeleton {}
