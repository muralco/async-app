import express from 'express';
import { compact, flattenDeep, isRegExp } from 'lodash';

import asyncConverter from './async';
import { converterId as orderConverterId } from './converters/order';
import legacyOrderConverter from './converters/order/legacy';
import schemaConverter, {
  converterId as schemaConverterId,
} from './converters/schema';

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
  opts: Opts<TEntities, TSchema> = {},
): App<TEntities, TSchema> => {
  const app = express() as App<TEntities, TSchema>;
  const {
    noMiddlewareOrder = false,
    converters = [],
    compileSchemaFn,
    generateSchemaErrorFn,
    validateResponseSchema,
    errorHandlerFn,
  } = opts;

  const converterIds = compact(converters.map(c => c.converterId));

  let schema: Converter<TEntities, TSchema>;
  if (compileSchemaFn) {
    // We check if the schema converter is present
    // if not we include it as our backward compatibility policy
    if (!converterIds.includes(schemaConverterId)) {
      schema = schemaConverter<TEntities, TSchema>(
        compileSchemaFn,
        generateSchemaErrorFn,
      );
    }
  }

  let order: Converter<TEntities, TSchema>;
  if (!noMiddlewareOrder) {
    // We check if the new order converter is present
    // if not we include it as our backward compatibility policy
    if (!converterIds.includes(orderConverterId)) {
      order = legacyOrderConverter();
    }
  }

  const async = asyncConverter<TEntities, TSchema>({
    compileSchema:
      compileSchemaFn && validateResponseSchema
        ? compileSchemaFn
        : undefined,
    errorHandler: errorHandlerFn,
  });

  METHODS.forEach(
    m =>
      (app[m] = patchMethod<TEntities, TSchema>(app, m, [
        async,
        ...converters,
        ...(schema && [schema]),
        ...(order && [order]),
      ]) as any),
  );

  return app;
};

export default createApp;
