import { describe, expect, it } from 'vitest';
import { centsToInput, formatPrice, paragraphs, parsePrice, slugify, whatsappLink } from './format';

describe('format', () => {
  it('formata preço em reais com unidade opcional', () => {
    expect(formatPrice(6990, 'kg')).toBe('R$ 69,90 / kg');
    expect(formatPrice(123456)).toBe('R$ 1.234,56');
    expect(formatPrice(null)).toBeNull();
  });

  it('converte o texto digitado em centavos', () => {
    expect(parsePrice('49,90')).toBe(4990);
    expect(parsePrice('R$ 1.234,56')).toBe(123456);
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('abc')).toBeNaN();
    expect(centsToInput(4990)).toBe('49,90');
  });

  it('gera slug e link do WhatsApp', () => {
    expect(slugify('Requeijão de Corte!')).toBe('requeijao-de-corte');
    expect(whatsappLink('+55 (54) 99999-0000', 'Olá & tudo?')).toBe(
      'https://wa.me/5554999990000?text=Ol%C3%A1%20%26%20tudo%3F',
    );
  });

  it('separa parágrafos por linha em branco', () => {
    expect(paragraphs('a\n\n b \n\n\nc')).toEqual(['a', 'b', 'c']);
  });
});
