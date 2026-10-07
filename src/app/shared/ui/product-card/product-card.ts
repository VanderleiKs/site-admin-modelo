import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AVAILABILITY_LABELS, type Product } from '../../../../shared/models';
import { formatPrice } from '../../../core/utils/format';

/** Cartão de produto usado na página inicial, no catálogo e em "relacionados". */
@Component({
  selector: 'app-product-card',
  imports: [RouterLink, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  templateUrl: './product-card.html',
})
export class ProductCard {
  readonly product = input.required<Product>();
  /** Use em imagens visíveis sem rolagem (melhora o LCP). */
  readonly priority = input(false);

  protected readonly price = computed(() =>
    formatPrice(this.product().priceCents, this.product().priceUnit),
  );
  protected readonly availability = computed(
    () => AVAILABILITY_LABELS[this.product().availability],
  );
}
