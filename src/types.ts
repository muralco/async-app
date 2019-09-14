import { Express, NextFunction, Request, Response } from 'express';

// === General ============================================================== //
export interface Context {
  method: Method;
  path?: string;
}

export interface Entities {
  _: unknown;
}

export type Req<TEntities extends Entities, T extends keyof TEntities> =
  Pick<TEntities, T> & Request;

// === Middlewares ========================================================== //
export type Decorator = {
  $provides?: string[];
  $requires?: string[];
  $permission?: string;
  $noOrder?: boolean;
  $deprecated?: 'in-use' | 'redirect' | 'rewrite';
};

export type CommonMiddleware<TEntities extends Entities> = (
  (req: Req<TEntities, keyof TEntities>, res: Response, next: NextFunction) =>
    Promise<any> | void
) & Decorator;

export type AsyncMiddleware<TEntities extends Entities> = (
  (req: Req<TEntities, keyof TEntities>) => Promise<unknown> | unknown
) & Decorator;

export type Middleware<TEntities extends Entities> =
  | CommonMiddleware<TEntities>
  | AsyncMiddleware<TEntities>
  ;

export type ProviderMiddleware<TEntities extends Entities> =
  Middleware<TEntities> & { $provides: string[] };

export type NonOrderableMiddleware<TEntities extends Entities> =
  Middleware<TEntities> & { $noOrder: boolean };

export type RequireMiddleware<TEntities extends Entities> =
  Middleware<TEntities> & { $requires: string[] };

export type PermissionMiddleware<TEntities extends Entities> =
  Middleware<TEntities> & { $permission: string };

export const isProviderMiddleware = <TEntities extends Entities>(
  o: Middleware<TEntities>,
): o is ProviderMiddleware<TEntities> =>
  !!(o.$provides && o.$provides.length);

export const isRequirMiddleware = <TEntities extends Entities>(
  o: Middleware<TEntities>,
): o is RequireMiddleware<TEntities> =>
  !!(o.$requires && o.$requires.length);

export const isPermissionMiddleware = <TEntities extends Entities>(
  o: Middleware<TEntities>,
): o is PermissionMiddleware<TEntities> =>
  !!o.$permission;

export const isNonOrderable = <TEntities extends Entities>(
  o: Middleware<TEntities>,
): o is NonOrderableMiddleware<TEntities> =>
  !!o.$noOrder;

// === Schema =============================================================== //
export type RequestScope = 'body' | 'query';
export type Scope = RequestScope | 'response';

export type Schema<TSchema = { [k: string]: any }> = {
  $schema?: TSchema;
  $scope?: Scope;
} & TSchema;

export type ValidationError = {
  expected?: string;
  key: (string|number)[];
};
export type ValidateSchema = (obj: any) => ValidationError[];
export type CompileSchema<T> = (
  schema: Schema<T>,
  context: Context,
) => ValidateSchema;

export type GenerateSchemaErrorFn = (
  errors: ValidationError[],
  source: string,
) => any;

// === Arguments ============================================================ //
export type MiddlewareArg<TEntities extends Entities> =
  | CommonMiddleware<TEntities>
  | CommonMiddleware<TEntities>[]
  | AsyncMiddleware<TEntities>
  ;

export type ArgumentOption<TEntities extends Entities, TSchema> =
  | MiddlewareArg<TEntities>
  | string
  | number
  | RegExp
  | Schema<TSchema>
  ;

export const isNumber = (m: unknown): m is number => typeof m === 'number';

export const isPromise = (f: unknown): f is Promise<any> =>
  f && typeof (f as Promise<any>).then === 'function';

export const isSchema = <TSchema>() =>
  (m: unknown): m is Schema<TSchema> =>
    typeof m === 'object';

export const isMiddlewareArg = <TEntities extends Entities>(
  o: ArgumentOption<TEntities, unknown>,
): o is MiddlewareArg<TEntities> =>
  Array.isArray(o) || typeof o === 'function';

export const isAsyncMiddleware = <TEntities extends Entities>(
  o: ArgumentOption<TEntities, unknown>,
): o is AsyncMiddleware<TEntities> =>
  typeof o === 'function' && o.length <= 1;

export const isMiddleware = <TEntities extends Entities>(
  o: ArgumentOption<TEntities, unknown>,
): o is Middleware<TEntities> =>
  typeof o === 'function';

// === Converters, App and options ========================================== //
export type Converter<TEntities extends Entities, TSchema> = (
  m: ArgumentOption<TEntities, TSchema>[],
  context: Context,
) => ArgumentOption<TEntities, TSchema>[];

export interface Opts<
  TEntities extends Entities,
  TSchema,
> {
  converters?: Converter<TEntities, TSchema>[];
  compileSchemaFn?: CompileSchema<TSchema>;
  generateSchemaErrorFn?: GenerateSchemaErrorFn;
  validateResponseSchema?: boolean;
}

export type Method = keyof AsyncApp<Entities, unknown>;

export type RequestHandler<
  TEntities extends Entities,
  TSchema,
> =
  (...m: ArgumentOption<TEntities, TSchema>[]) => void;

interface AsyncApp<TEntities extends Entities, TSchema> {
  delete: RequestHandler<TEntities, TSchema>;
  get: RequestHandler<TEntities, TSchema>;
  patch: RequestHandler<TEntities, TSchema>;
  post: RequestHandler<TEntities, TSchema>;
  put: RequestHandler<TEntities, TSchema>;
  use: RequestHandler<TEntities, TSchema>;
}

export type App<TEntities extends Entities, TSchema> =
  Express & AsyncApp<TEntities, TSchema>;
