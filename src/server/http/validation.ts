import { z } from 'zod';
import { SLUG_PATTERN } from '../../shared/models';
import { badRequest } from './errors';

/** Valida `data` com o schema zod; em caso de erro lança 400 com mensagens por campo. */
export function parseBody<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  throw badRequest(
    'Dados inválidos. Verifique os campos destacados.',
    result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'body',
      message: issue.message,
    })),
  );
}

/** Texto obrigatório (aparado) com limites de tamanho e mensagens em português. */
export const requiredText = (label: string, min: number, max: number) =>
  z
    .string({ error: `${label} é obrigatório.` })
    .trim()
    .min(min, `${label} deve ter ao menos ${min} caracteres.`)
    .max(max, `${label} deve ter no máximo ${max} caracteres.`);

/** Texto opcional: string vazia vira null. */
export const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} deve ter no máximo ${max} caracteres.`)
    .nullish()
    .transform((value) => (value ? value : null));

export const slugSchema = z
  .string({ error: 'Slug é obrigatório.' })
  .trim()
  .min(1, 'Slug é obrigatório.')
  .max(140, 'Slug muito longo.')
  .regex(SLUG_PATTERN, 'Use apenas letras minúsculas, números e hífens (ex.: queijo-colonial).');

export const idSchema = z.string().uuid('Identificador inválido.');

export const optionalUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((value) => (value ? value : null))
    .refine(
      (value) => value === null || /^https?:\/\/\S+$/i.test(value),
      `${label}: informe uma URL completa (https://...).`,
    );
