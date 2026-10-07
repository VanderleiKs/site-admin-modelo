import type { ErrorRequestHandler } from 'express';
import type { ApiError, FieldError } from '../../shared/models';

/** Erro de negócio com status HTTP e, opcionalmente, erros por campo. */
export class HttpError extends Error {
  readonly status: number;
  readonly errors?: readonly FieldError[];

  constructor(status: number, message: string, errors?: readonly FieldError[]) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export const notFound = (message = 'Registro não encontrado.') => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);
export const badRequest = (message: string, errors?: readonly FieldError[]) =>
  new HttpError(400, message, errors);

/**
 * Converte qualquer erro em resposta JSON padronizada, sem expor detalhes internos.
 * O Express 5 encaminha para cá inclusive erros lançados em handlers async.
 */
export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  let body: ApiError;
  if (error instanceof HttpError) {
    body = { status: error.status, message: error.message, errors: error.errors };
  } else if (isBodyParserError(error)) {
    const tooLarge = error.status === 413;
    body = {
      status: error.status,
      message: tooLarge ? 'Conteúdo maior que o permitido.' : 'Requisição inválida.',
    };
  } else {
    console.error(`[api] ${req.method} ${req.path}`, error);
    body = { status: 500, message: 'Erro interno. Tente novamente em instantes.' };
  }
  res.status(body.status).setHeader('Cache-Control', 'no-store').json(body);
};

function isBodyParserError(error: unknown): error is { status: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof (error as { status?: unknown }).status === 'number'
  );
}
