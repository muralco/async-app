export class CustomResponse<T> {
  constructor(
    public readonly value: T,
    public readonly headers: Record<string, string | string[]> | undefined,
    public readonly isRaw: boolean,
  ) {}
}

export const createCustomResponse = <T>(
  value: T,
  opts?: {
    isRaw?: boolean;
    headers?: Record<string, string | string[]>;
  },
): CustomResponse<T> =>
  new CustomResponse(value, opts && opts.headers, !!(opts && opts.isRaw));
