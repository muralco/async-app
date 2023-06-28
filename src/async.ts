import { CustomResponse } from './custom-response';
import { CustomError } from './error';
import {
  CommonMiddleware,
  CompileSchema,
  Converter,
  Decorator,
  Entities,
  ErrorHandlerFn,
  isAsyncMiddleware,
  isMiddleware,
  isNumber,
  isPromise,
  isSchema,
  MapAsyncResultFn,
  Middleware,
  ValidateSchema,
} from './types';

const DEFAULT_STATUS_CODE = 200;

interface AsyncOptions<TEntities extends Entities, TSchema> {
  compileSchema?: CompileSchema<TSchema>;
  errorHandler?: ErrorHandlerFn<TEntities>;
  mapAsyncResultFn?: MapAsyncResultFn<TEntities>;
}

type Options<TEntities extends Entities> =  {
  statusCode: number;
  isLastMiddleware: boolean;
  validateSchema?: ValidateSchema;
  mapAsyncResultFn?: MapAsyncResultFn<TEntities>;
};

const copyDecorators = <TSrc extends Decorator, TDest extends Decorator>(
  src: TSrc,
  dest: TDest,
) => {
  const keys = Object
    .keys(src)
    .filter(k => k.startsWith('$')) as (keyof Decorator)[];

  keys.forEach(k => dest[k] = src[k]);
};

const mapMiddleware = <TEntities extends Entities>(
  middleware: Middleware<TEntities>,
  options: Options<TEntities>,
  errorHandler?: ErrorHandlerFn<TEntities>,
): CommonMiddleware<TEntities> => {
  const fn: CommonMiddleware<TEntities> = async (req, res, next) => {
    try {
      // First we run the middleware as usual
      const promiseOrVoid = isAsyncMiddleware(middleware)
        ? middleware(req)
        : middleware(req, res, next);

      const promise = isPromise(promiseOrVoid)
        ? promiseOrVoid
        : Promise.resolve(promiseOrVoid);

      const result = await promise;

      const isAsync = isAsyncMiddleware(middleware);

      const mappedVal = options.mapAsyncResultFn
      ? await options.mapAsyncResultFn(result, {
        isAsyncMiddleware: isAsync,
        isLastMiddleware: options.isLastMiddleware,
        req,
      })
      : result;

      let val = mappedVal;
      let isRaw = false;
      let headers: Record<string, string|string[]> | undefined;

      if (mappedVal instanceof CustomResponse) {
        val = mappedVal.value;
        isRaw = mappedVal.isRaw;
        headers = mappedVal.headers;
      }

      if (!isAsync) {
        // This middleware has `res` so we it will take care of the response
        return;
      }

      if (!options.isLastMiddleware || req.method === 'USE') {
        // `USE` middlewares never return stuff, so there is no need for us to
        // attempt to process the result. `options` is only passed to the last
        //  middleware, if this is not the last middleware, continue with next
        // one
        return next();
      }

      // The middleware already responded so there's nothing for us to do
      if (res.headersSent) return;

      if (options.validateSchema) {
        // Lets validate that schema
        const schemaErrors = options.validateSchema(val);

        if (schemaErrors.length) {
          const response = {
            error: 'INVALID_SCHEMA_RESPONSE',
            path: schemaErrors[0].key,
            source: 'response',
          };

          res.status(400).send(response);
          return;
        }
      }

      if (headers) {
        res.set(headers);
      }

      res.status(options.statusCode);

      if (isRaw) {
        res.send(val);
      } else {
        res.json(val || {});
      }
    } catch (err) {
      if (!err || !(err instanceof CustomError)) { return next(err); }

      const { statusCode, error, extra } = err;

      // User defined error handler for all middlewares in app
      if (errorHandler) {
        return errorHandler(err, req, res, next);
      }
      return res.status(statusCode || 500).send({ error, ...extra });
    }
  };

  copyDecorators(middleware, fn);

  // Set the wrapper function's name to the original function's name. When using
  // observability tools that record function names, this helps identify the
  // original function.
  Object.defineProperty(fn, 'name', { value: middleware.name });

  return fn;
};

export default <TEntities extends Entities, TSchema>({
    errorHandler,
    compileSchema,
    mapAsyncResultFn,
  }: AsyncOptions<TEntities, TSchema> = {}): Converter<TEntities, TSchema> =>
  (args, context) => {
    const statusCode = args.find(isNumber) || DEFAULT_STATUS_CODE;

    const schema = args
      .filter(isSchema<TSchema>())
      .find(s => s.$scope === 'response');
    const rawSchema = schema
      ? schema.$schema
        ? schema.$schema
        : schema
      : undefined;
    const validateSchema =
      compileSchema && rawSchema && compileSchema(rawSchema, context);

    const middlewares = args.filter(isMiddleware);
    const lastMiddleware = middlewares[middlewares.length - 1];

    // 4 argument middlewares are error handlers, and we leave them untouched
    return args.map(m =>
      isMiddleware(m) && m.length < 4
        ? mapMiddleware(
          m,
          // Check if this is the last valid middleware (not the statusCode arg)
          {
            isLastMiddleware: m === lastMiddleware,
            mapAsyncResultFn,
            statusCode,
            validateSchema,
          },
          // Passes a custom error handler
          errorHandler,
        )
        : m,
    );
  };
