import { SLUG_PATTERN } from '../../../shared/models';

export { SLUG_PATTERN };

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 6990, 'kg' → "R$ 69,90 / kg"; null → null (sob consulta). */
export function formatPrice(cents: number | null | undefined, unit?: string | null): string | null {
  if (cents === null || cents === undefined) return null;
  const value = BRL.format(cents / 100).replace(/ /g, ' ');
  return unit ? `${value} / ${unit}` : value;
}

/** "49,90" | "R$ 1.234,56" | "10" → centavos; vazio → null; inválido → NaN. */
export function parsePrice(input: string | null | undefined): number | null {
  const raw = (input ?? '').replace(/R\$\s?/i, '').trim();
  if (!raw) return null;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return Number.NaN;
  return Math.round(Number(normalized) * 100);
}

export function centsToInput(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? '' : (cents / 100).toFixed(2).replace('.', ',');
}

export function whatsappLink(number: string, message?: string | null): string {
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${number.replace(/\D/g, '')}${text}`;
}

/** Parágrafos separados por linha em branco. */
export function paragraphs(text: string | null | undefined): string[] {
  return (text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
}
