import { z } from 'zod';
import type { CategoryInput, ProductInput } from '../../shared/models';
import { idSchema, optionalText, requiredText, slugSchema } from '../http/validation';

export const categorySchema = z.object({
  name: requiredText('Nome', 2, 80),
  slug: slugSchema,
  description: optionalText('Descrição', 500),
  sortOrder: z.number().int().min(0).max(100_000).default(0),
}) satisfies z.ZodType<CategoryInput, unknown>;

export const productSchema = z.object({
  name: requiredText('Nome', 2, 120),
  slug: slugSchema,
  shortDescription: requiredText('Descrição curta', 10, 280),
  description: requiredText('Descrição completa', 10, 5000),
  categoryId: idSchema,
  priceCents: z
    .number()
    .int('Preço inválido.')
    .min(0, 'O preço não pode ser negativo.')
    .max(100_000_000)
    .nullable()
    .default(null),
  priceUnit: optionalText('Unidade', 30),
  availability: z.enum(['IN_STOCK', 'MADE_TO_ORDER', 'OUT_OF_STOCK']).default('IN_STOCK'),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1_000_000).default(0),
  mainImageId: idSchema.nullable().default(null),
  galleryImageIds: z
    .array(idSchema)
    .max(12, 'A galeria aceita no máximo 12 imagens.')
    .refine((ids) => new Set(ids).size === ids.length, 'Imagens repetidas na galeria.')
    .default([]),
}) satisfies z.ZodType<ProductInput, unknown>;
