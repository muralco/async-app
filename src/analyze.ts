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
  Schema,
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

/**
 * Get information about where the endpoint is defined in the source code.
 */
const getEndpointSource = () => {
  const stack = new Error().stack;
  if (!stack) {
    return;
  }

  // Select the stack frame where the endpoint is defined.
  // Assume V8 stack trace format (https://v8.dev/docs/stack-trace-api):
  // [0]: Error description
  // [1]: This function call
  // [2]: ExpressAppStub.[method]() call
  // [3]: The target frame
  const frame = stack.split('\n')[3];

  // Match the filename and line number from a string formatted like:
  //
  //     at fn (/path/to/endpoints.js:72:11)
  //
  const result = frame.match(/^.*\((.+):(\d+):\d+\)$/);
  if (!result) {
    return;
  }

  const filename = result[1];
  const lineNumber = Number(result[2]);

  return { filename, lineNumber };
};

const isString = (a: Arg): a is string => typeof a === 'string';
const isNumber = (a: Arg): a is number => typeof a === 'number';

export interface Route<TSchema> {
  deprecated: Decorator['$deprecated'];
  description?: string;
  method: Method;
  path: string;
  permissions: string[];
  schema?: TSchema;
  responseSchema?: TSchema;
  source?: {
    filename: string;
    lineNumber: number;
  };
  successStatus: number;
  summary: string;
}

class ExpressAppStub<TSchema> {
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
  responseSchema: TSchema | undefined = undefined;
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
      const schemas = other.filter(isSchema()) as Schema<TSchema>[];
      const schema = schemas.find(s => s.$scope !== 'response');
      const responseSchema = schemas.find(s => s.$scope === 'response');
      const successStatus = other.find(isNumber) || 200;
      const middlewares = other.filter(isMiddleware);
      const deprecated = middlewares.find(m => !!m.$deprecated);
      const permissions = this.permissions.concat(getPermissions(middlewares));
      const source = getEndpointSource();

      this.routes.push({
        deprecated: deprecated && deprecated.$deprecated,
        description,
        method,
        path: path.toString(),
        permissions,
        responseSchema,
        schema: (this.schema || schema)
          ? Object.assign({}, this.schema, schema)
          : undefined,
        source,
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
      .filter(m => m instanceof ExpressAppStub) as ExpressAppStub<TSchema>[];
    const schemas = middlewares
      .filter(m => !(m instanceof ExpressAppStub) && typeof m === 'object');
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

const expressStub = () => new ExpressAppStub();
Object.assign(expressStub, {
  // For ESM compatibility
  default: expressStub,
  // Define all other express methods
  json: noop,
  raw: noop,
  Router: noop,
  static: noop,
  text: noop,
  urlencoded: noop,
});

const originalAsyncApp = require('async-app');
originalAsyncApp.default = () => new ExpressAppStub();

// Monkeypatch require to return an `App` instead of an express instance.
const originalRequire = Module.prototype.require;
Module.prototype.require = function require(path: string) {
  if (path === 'express') {
    return expressStub;
  }
  return originalRequire.apply(this, arguments); // tslint:disable-line
};

const analyzeApp = <TEntities extends Entities, TSchema>(
  returnYourAppFromThisFn: () => App<TEntities, TSchema>,
): Route<TSchema>[] => {
  const app = returnYourAppFromThisFn() as any as ExpressAppStub<TSchema>;
  return app.getRoutes();
};

export const analyzeFile = (absolutePathToApp: string) =>
  analyzeApp(() => require(absolutePathToApp));

export const removeScope = <TSchema>(schema: TSchema): TSchema =>
  omit(schema as unknown as object, '$scope') as unknown as TSchema;

export default analyzeApp;
