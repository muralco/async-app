import { flattenDeep, omit, sortBy } from 'lodash';
import {
  App,
  ArgumentOption,
  Decorator,
  Entities,
  isMiddleware,
  isPermissionMiddleware,
  isSchema,
  Method,
} from './types';

const Module = require('module');

type Arg = ArgumentOption<Entities, {}>;
type Endpoint = (path: string, ...args: Arg[]) => void;

const noop = () => { };
const getPermissions = (middlewares: Arg[]) =>
  middlewares
    .filter(isMiddleware)
    .filter(isPermissionMiddleware)
    .filter(m => !!m.$permission)
    .map(m => m.$permission);

const isString = (a: Arg): a is string => typeof a === 'string';
const isNumber = (a: Arg): a is number => typeof a === 'number';

export interface Route<TSchema> {
  deprecated: Decorator['$deprecated'];
  description?: string;
  method: Method;
  path: string;
  permissions: string[];
  schema?: TSchema;
  successStatus: number;
  summary: string;
}

class MetadataApp<TSchema> {
  delete: Endpoint;
  engine = noop;
  get: Endpoint;
  options = noop;
  param = noop;
  patch: Endpoint;
  permissions: string[] = [];
  post: Endpoint;
  put: Endpoint;
  response = { end: noop };
  routes: Route<TSchema>[] = [];
  schema: any = undefined;
  set = noop;
  use: (...args: Arg[]) => void;

  constructor() {
    this.delete = this.generateRoute('delete');
    this.get = this.generateRoute('get');
    this.patch = this.generateRoute('patch');
    this.post = this.generateRoute('post');
    this.put = this.generateRoute('put');
    this.use = (...args) => this.generateChild(...args);
  }

  generateRoute(method: Method) {
    return (path: string|RegExp, ...args: Arg[]) => {
      const [summary, description = ''] = args.filter(isString);
      const other = flattenDeep(args).filter(a => !!a);
      const schema = other.find(isSchema());
      const successStatus = other.find(isNumber) || 200;
      const middlewares = other.filter(isMiddleware);
      const deprecated = middlewares.find(m => !!m.$deprecated);
      const permissions = this.permissions.concat(getPermissions(middlewares));

      this.routes.push({
        deprecated: deprecated && deprecated.$deprecated,
        description,
        method,
        path: path.toString(),
        permissions,
        schema: (this.schema || schema)
          ? Object.assign({}, this.schema, schema)
          : undefined,
        successStatus,
        summary,
      });
    };
  }

  generateChild(...args: Arg[]) {
    const hasPrefix = typeof args[0] === 'string';
    const prefix = hasPrefix ? args[0] : '';
    const middlewares = flattenDeep(!hasPrefix
      ? args
      : args.slice(1));
    const docs = middlewares
      .filter(m => m instanceof MetadataApp) as MetadataApp<TSchema>[];
    const schemas = middlewares
      .filter(m => !(m instanceof MetadataApp) && typeof m === 'object');
    if (schemas.length) {
      this.schema = Object.assign({}, this.schema, ...schemas);
    }
    const routeLists = docs.map(d =>
      d.routes.map(r => ({
        ...r,
        path: `${prefix}${r.path}`.replace(/\/$/, ''),
      })),
    );
    this.routes.push(...flattenDeep(routeLists));
    this.permissions.push(...getPermissions(middlewares));
  }

  sort() {
    this.routes = sortBy(this.routes, ['path', 'method']);
  }

  getRoutes() {
    this.sort();
    return this.routes;
  }
}

const originalAsyncApp = require('async-app');
originalAsyncApp.default = () => new MetadataApp();

// Monkeypatch require to return an `App` instead of an express instance.
const originalRequire = Module.prototype.require;
Module.prototype.require = function require(path: string) {
  if (path === 'express') {
    const ctor = () => new MetadataApp();
    Object.assign(ctor, {
      default: ctor,
      static: noop,
    });
    return ctor;
  }
  return originalRequire.apply(this, arguments); // tslint:disable-line
};

export default <TEntities extends Entities, TSchema>(
  returnYourAppFromThisFn: () => App<TEntities, TSchema>,
): Route<TSchema>[] => {
  const app = returnYourAppFromThisFn() as any as MetadataApp<TSchema>;
  return app.getRoutes();
};

export const removeScope = <TSchema>(schema: TSchema): TSchema =>
  omit(schema as unknown as object, '$scope') as unknown as TSchema;
