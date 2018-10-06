import { NextFunction, Request, Response } from 'express';

export interface Entities {
  _: unknown;
}

export type Converter<
  TEntities extends Entities = Entities,
  T extends keyof TEntities = '_',
  TExtra = {}
> = (m: ArgumentOption<TEntities, T, TExtra>[]) =>
  ArgumentOption<TEntities, T, TExtra>[];

export interface Opts<
  TEntities extends Entities = Entities,
  T extends keyof TEntities = '_',
  TExtra = {}
> {
  converters?: Converter<TEntities, T, TExtra>[];
  compileSchemaFn?: CompileSchema;
  validateResponseSchema?: boolean;
}

export type Req<
  TEntities extends Entities = Entities,
  T extends keyof TEntities = '_',
  TExtra = {}
> = Pick<TEntities, T> & Request & TExtra;

export type Decorator = {
  $provides?: string[];
  $requires?: string[];
  $permission?: string[];
  $noOrder?: boolean;
};

export type ProviderMiddleware<TEntities extends Entities = Entities> =
  Middleware<TEntities, any> & { $provides: string[] };

export type NonOrderableMiddleware<TEntities extends Entities = Entities> =
  Middleware<TEntities, any> & { $noOrder: boolean };

export type RequireMiddleware<TEntities extends Entities = Entities> =
  Middleware<TEntities, any> & { $requires: string[] };

export type CommonMiddleware<
  TEntities extends Entities = Entities,
  T extends keyof TEntities = '_',
  TExtra = {}
> = (
  (req: Req<TEntities, T, TExtra>, res: Response, next: NextFunction) =>
    Promise<any> | void
  ) & Decorator;

export type AsyncMiddleware<
  TEntities extends Entities = Entities,
  T extends keyof TEntities = '_',
  TExtra = {},
  TResult = unknown,
> = (
  (req: Req<TEntities, T, TExtra>) => Promise<TResult> | TResult
) & Decorator;

export type Middleware<
  TEntities extends Entities = Entities,
  T extends keyof TEntities = '_',
  TExtra = {},
> =
  | CommonMiddleware<TEntities, T, TExtra>
  | AsyncMiddleware<TEntities, T, TExtra>
  ;

export type MiddlewareArg<
  TEntities extends Entities = Entities,
  T extends keyof TEntities = '_',
  TExtra = {}
> =
  | CommonMiddleware<TEntities, T, TExtra>
  | CommonMiddleware<TEntities, T, TExtra>[]
  | AsyncMiddleware<TEntities, T, TExtra>
  ;

export type Scope = 'body' | 'query';

export type Schema<TSchema = { [k: string]: any }> = {
  $scope?: Scope;
  $response?: boolean;
} & TSchema;

export type ArgumentOption<
  TEntities extends Entities = Entities,
  T extends keyof TEntities = '_',
  TExtra = {},
  TSchema = { [k: string]: any },
> =
  | MiddlewareArg<TEntities, T, TExtra>
  | string
  | number
  | RegExp
  | Schema<TSchema>
  ;

export type Method = keyof App;

export type RequestHandler<TEntities extends Entities = Entities> =
  (...m: ArgumentOption<TEntities, any>[]) => void;

export interface App<TEntities extends Entities = Entities> {
  delete: RequestHandler<TEntities>;
  get: RequestHandler<TEntities>;
  patch: RequestHandler<TEntities>;
  post: RequestHandler<TEntities>;
  put: RequestHandler<TEntities>;
  use: RequestHandler<TEntities>;
}

type SchemaResult = {
  error: any;
} | undefined;

export type ValidateSchema = (data: any) => SchemaResult;
export type CompileSchema = (schema: Schema) => ValidateSchema;

export const isNumber = <TEntities extends Entities = Entities>
  (m: ArgumentOption<TEntities>): m is number => typeof m === 'number';

export const isPromise = (f: any): f is Promise<any> =>
  f && typeof f.then === 'function';

export const isSchema = <TSchema = {}>(m: ArgumentOption):
  m is Schema<TSchema> => typeof m === 'object';

export const isMiddlewareArg = <
  TEntities extends Entities = Entities,
  T extends keyof TEntities = '_',
  TExtra = {}
>(
  o: ArgumentOption<TEntities, T, TExtra>,
): o is MiddlewareArg<TEntities, T, TExtra> =>
  Array.isArray(o) || typeof o === 'function';

export const isAsyncMiddleware = <
  TEntities extends Entities = Entities,
  T extends keyof TEntities = '_',
  TExtra = {},
  TResult = unknown,
>(
  o: ArgumentOption<TEntities, T, TExtra>,
): o is AsyncMiddleware<TEntities, T, TExtra, TResult> =>
  typeof o === 'function' && o.length === 1;

export const isMiddleware = <
  TEntities extends Entities = Entities,
  T extends keyof TEntities = '_',
  TExtra = {}
>(
  o: ArgumentOption<TEntities, T, TExtra>,
): o is Middleware<TEntities, T, TExtra> =>
  typeof o === 'function';

export const isProviderMiddleware = <
  TEntities extends Entities = Entities,
>(
  o: Middleware<TEntities>,
): o is ProviderMiddleware<TEntities> =>
  !!(o.$provides && o.$provides.length);

export const isRequiredMiddleware = <
  TEntities extends Entities = Entities,
>(
  o: Middleware<TEntities>,
): o is RequireMiddleware<TEntities> =>
  !!(o.$requires && o.$requires.length);

export const isNonOrderable = <
  TEntities extends Entities = Entities,
>(
  o: Middleware<TEntities>,
): o is NonOrderableMiddleware<TEntities> =>
  !!o.$noOrder;

export const methodsSourcesMap: { [key: string]: Scope } = {
  DELETE: 'query',
  GET: 'query',
  PATCH: 'body',
  POST: 'body',
  PUT: 'body',
};
