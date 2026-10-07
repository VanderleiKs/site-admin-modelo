import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import type { Product } from '../../../../shared/models';
import { ProductCard } from './product-card';

const base: Product = {
  id: '1',
  name: 'Queijo Teste',
  slug: 'queijo-teste',
  shortDescription: 'Curta',
  description: 'Longa',
  category: { id: 'c', name: 'Frescos', slug: 'frescos' },
  priceCents: 4990,
  priceUnit: 'kg',
  availability: 'IN_STOCK',
  featured: true,
  active: true,
  sortOrder: 0,
  mainImage: null,
  gallery: [],
  updatedAt: '2026-01-01T00:00:00Z',
};

function render(product: Product): HTMLElement {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(ProductCard);
  fixture.componentRef.setInput('product', product);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ProductCard', () => {
  it('exibe nome, link amigável, preço e destaque', () => {
    const el = render(base);
    expect(el.querySelector('h3')?.textContent).toContain('Queijo Teste');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/produtos/queijo-teste');
    expect(el.textContent).toContain('R$ 49,90 / kg');
    expect(el.textContent).toContain('Destaque');
  });

  it('mostra "Sob consulta" e a disponibilidade quando não está em estoque', () => {
    const el = render({
      ...base,
      priceCents: null,
      featured: false,
      availability: 'MADE_TO_ORDER',
    });
    expect(el.textContent).toContain('Sob consulta');
    expect(el.textContent).toContain('Sob encomenda');
    expect(el.textContent).not.toContain('Destaque');
  });
});
