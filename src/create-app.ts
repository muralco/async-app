import express from 'express';
import { flattenDeep, isRegExp } from 'lodash';

import asyncConverter from './async';
import orderMiddlewares from './converters/order-legacy';
import schemaConverter from './schema';

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

const isPath = (arg: unknown) => (typeof arg === 'string' || isRegExp(arg));

const patchMethod = <
  TEntities extends Entities,
  TSchema,
>(
  app: express.Express,
  method: Method,
  converters: Converter<TEntities, TSchema>[],
): RequestHandler<TEntities, TSchema> => {
  const old = app[method].bind(app);

  return ((...args: ArgumentOption<TEntities, TSchema>[]) => {
    const first = args[0];

    if (method !== 'use' && !isPath(first)) {
      throw new Error('First middleware MUST BE a path/RegExp string');
    }

    const path = isPath(first) ? [first] : [];
    const argMiddlewares = isPath(first) ? args.slice(1) : args;

    const flattenMiddlewares =
      flattenDeep<ArgumentOption<TEntities, TSchema>>(
        argMiddlewares,
      );

    const context = { method, path: path[0] as string };

    const middlewaresConverted = converters.reduce(
      (middlewaresAcc, converter) => converter(middlewaresAcc, context),
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

export const createApp = <TEntities extends Entities = Entities, TSchema = {}>(
  opts?: Opts<TEntities, TSchema>,
): App<TEntities, TSchema> => {
  const app = express() as App<TEntities, TSchema>;
  const converters = opts && opts.converters || [];

  if (opts && opts.compileSchemaFn) {
    converters.push(schemaConverter(
      opts.compileSchemaFn,
      opts.generateSchemaErrorFn,
    ));
  }

  const async = asyncConverter<TEntities, TSchema>({
    compileSchema:
      opts && opts.compileSchemaFn && opts.validateResponseSchema
        ? opts.compileSchemaFn
        : undefined,
    errorHandler: opts && opts.errorHandlerFn ? opts.errorHandlerFn : undefined,
  });

  METHODS.forEach(m =>
    app[m] = patchMethod<TEntities, TSchema>(
      app,
      m,
      [
        async,
        ...converters,
        orderMiddlewares<TEntities, TSchema>(),
      ],
    ) as any,
  );

  return app;
};

export default createApp;
