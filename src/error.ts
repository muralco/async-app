import { ErrorRequestHandler } from 'express';

export class CustomError extends Error {
  statusCode: number;
  error?: string;
  extra: unknown;

  constructor(statusCode: number, error?: string, extra?: unknown) {
    super('CustomError');
    this.statusCode = statusCode;
    this.error = error;
    this.extra = extra
      ? { ...extra }
      : {};
  }
}

const createError = (statusCode: number) =>
  (error?: string, extra?: unknown) =>
    new CustomError(statusCode, error, extra);

export const badRequest = createError(400);
export const custom = (statusCode: number, error?: string, extra?: unknown) =>
  createError(statusCode)(error, extra);
export const forbidden = createError(403);
export const internalServerError = createError(500);
export const notFound = createError(404);
export const unauthorized = createError(401);

export const errorMiddleware: ErrorRequestHandler = (err, _, res, next) => {
  if (!err || !(err instanceof CustomError)) { return next(err); }

  const { statusCode, error, extra } = err;

  return res.status(statusCode || 500).send({ error, ...extra });
};
