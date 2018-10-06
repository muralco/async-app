import express from 'express';
import { flattenDeep, isRegExp } from 'lodash';

import asyncConverter from './converters/async';
import orderMiddlewares from './converters/order-middlewares';
import schemaConverter from './converters/schema';

import {
  App,
  ArgumentOption,
  Converter,
  Entities,
  isMiddlewareArg,
  Method,
  Opts,
  RequestHandler,
} from './types';

export * from './types';

const isPath = (arg: ArgumentOption) =>
  (typeof arg === 'string' || isRegExp(arg));

const patchMethod = <TEntities extends Entities = Entities>(
  app: express.Express,
  method: Method,
  converters: Converter[],
): RequestHandler<TEntities> => {
  const old = app[method].bind(app);

  return ((...args: ArgumentOption<TEntities, any>[]) => {
    const first = args[0];

    if (method !== 'use' && !isPath(first)) {
      throw new Error('First middleware MUST BE a path/RegExp string');
    }

    const path = isPath(first) ? [first] : [];
    const argMiddlewares = isPath(first) ? args.slice(1) : args;

    const flattenMiddlewares =
      flattenDeep<ArgumentOption<TEntities>>(argMiddlewares);

    const middlewaresConverted = converters.reduce(
      (middlewaresAcc, converter) => converter(middlewaresAcc),
      flattenMiddlewares,
    );
    const middlewares = [
      ...path,
      ...middlewaresConverted.filter(isMiddlewareArg),
    ].filter(m => !!m);

    return old(...middlewares);
  });
};

const METHODS: Method[] = [
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'use',
];

export const createApp =
  <TEntities extends Entities = Entities>
  (opts?: Opts<TEntities, any>): express.Express & App<TEntities> => {
    const app = express() as express.Express & App<TEntities>;
    const converters = opts && opts.converters || [];

    if (opts && opts.compileSchemaFn) {
      converters.push(schemaConverter(opts.compileSchemaFn));
    }

    const async = opts && opts.compileSchemaFn && opts.validateResponseSchema
      ? asyncConverter(opts.compileSchemaFn)
      : asyncConverter();

    METHODS.forEach(m =>
      app[m] = patchMethod<TEntities>(
        app,
        m,
        [async, ...converters, orderMiddlewares],
      ) as any,
    );

    return app;
  };

export default createApp;
