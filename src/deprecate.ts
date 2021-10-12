import { NextFunction, Request, Response } from 'express';
import { decorate } from './decorate';
import { Entities, Middleware } from './types';

type Method =
  | 'CONNECT'
  | 'DELETE'
  | 'GET'
  | 'HEAD'
  | 'OPTIONS'
  | 'PATCH'
  | 'POST'
  | 'PUT'
  | 'TRACE'
;

type MethodGetter = Method|((r: Request) => Method);
type PathGetter = string|((r: Request) => string);
type BodyGetter = (r: Request) => any;

const pathWith = (getter: PathGetter, req: Request): string =>
  typeof getter === 'function' ? getter(req) : getter;
const methodWith = (getter: MethodGetter, req: Request): Method =>
  typeof getter === 'function' ? getter(req) : getter;

export const forImpl = (
  path: PathGetter,
  method?: MethodGetter,
): Middleware<Entities> => decorate(
  { $deprecated: 'in-use' },
  (req: Request, res: Response, next: NextFunction) => {
    const methodGetter = method || (req.method as Method);
    const actualPath = pathWith(path, req);
    const actualMethod = methodWith(methodGetter, req).toUpperCase();
    res.set('Deprecated-For', `${actualMethod} ${actualPath}`);

    next();
  },
);

export const endpoint: Middleware<Entities> = decorate(
  { $deprecated: 'in-use' },
  (_: Request, res: Response, next: NextFunction) => {
    res.set('Deprecated', 'true');
    next();
  },
);

export const redirect = (
  path: PathGetter,
  status = 302,
): Middleware<Entities> => decorate(
  { $deprecated: 'redirect' },
  (req: Request, res: Response, _: NextFunction) => {
    const actualPath = pathWith(path, req);
    res.set('Deprecated-For', `GET ${actualPath}`);
    res.redirect(status, actualPath);
  },
);

export const rewrite = (
  method: Method,
  path: PathGetter,
  getBody?: BodyGetter,
): Middleware<Entities> => {
  const pathGetter = typeof path === 'function'
    ? path
    : () => path;

  return decorate(
    { $deprecated: 'rewrite' },
    (req: Request, res: Response, next: NextFunction) => {
      const actualPath = pathWith(pathGetter, req);
      res.set('Deprecated-For', `${method} ${actualPath}`);
      req.method = method;
      req.url = actualPath;
      if (getBody) req.body = getBody(req);
      next();
    },
  );
};

export const deprecate = {
  endpoint,
  for: forImpl,
  redirect,
  rewrite,
};
