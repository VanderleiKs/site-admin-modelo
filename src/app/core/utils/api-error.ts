import { HttpErrorResponse } from '@angular/common/http';
import type { ApiError } from '../../../shared/models';

/** Mensagem amigável a partir de um erro HTTP da API. */
export function errorMessage(
  error: unknown,
  fallback = 'Não foi possível concluir a operação.',
): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  if (error.status === 0) return 'Sem conexão com o servidor. Verifique sua internet.';
  const body = error.error as Partial<ApiError> | null;
  return typeof body?.message === 'string' ? body.message : fallback;
}

/** Erros por campo (400) no formato { campo: mensagem }. */
export function fieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (error instanceof HttpErrorResponse) {
    for (const item of (error.error as Partial<ApiError> | null)?.errors ?? []) {
      result[item.field.split('.')[0]] ??= item.message;
    }
  }
  return result;
}
