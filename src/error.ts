export class CustomError extends Error {
  statusCode: number;
  error?: string;
  extra: unknown;

  constructor(statusCode: number, error?: string, extra?: unknown) {
    super(error || 'CustomError');
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
