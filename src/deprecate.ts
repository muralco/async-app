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
type PathGetter = string|((r: Request) => string);
type BodyGetter = (r: Request) => any;

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
    const actualPath = typeof path === 'function' ? path(req) : path;
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
      const actualPath = pathGetter(req);
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
  redirect,
  rewrite,
};
