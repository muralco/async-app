import { CustomError } from './error';
import {
  CommonMiddleware,
  CompileSchema,
  Converter,
  Decorator,
  Entities,
  isAsyncMiddleware,
  isMiddleware,
  isNumber,
  isPromise,
  isSchema,
  Middleware,
  ValidateSchema,
} from './types';

const DEFAULT_STATUS_CODE = 200;

type Options = {
  statusCode: number;
  validateSchema?: ValidateSchema;
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
  options?: Options,
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

      const val = await promise;

      if (!isAsyncMiddleware(middleware)) {
        // This middleware has `res` so we it will take care of the response
        return;
      }

      if (typeof options === 'undefined' || req.method === 'USE') {
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

      res.status(options.statusCode).json(val || {});
    } catch (err) {
      if (!err || !(err instanceof CustomError)) { return next(err); }

      const { statusCode, error, extra } = err;

      return res.status(statusCode || 500).send({ error, ...extra });
    }
  };

  copyDecorators(middleware, fn);

  return fn;
};

export default <TEntities extends Entities, TSchema>(
  compileSchema?: CompileSchema<TSchema>,
): Converter<TEntities, TSchema> => (args, context) => {
  const statusCode = args.find(isNumber) || DEFAULT_STATUS_CODE;

  const schema = args
    .filter(isSchema<TSchema>())
    .find(s => s.$scope === 'response');
  const validateSchema = compileSchema
    && schema
    && compileSchema(schema, context);

  const middlewares = args.filter(isMiddleware);
  const lastMiddleware = middlewares[middlewares.length - 1];

  return args.map(m => isMiddleware(m)
      ? mapMiddleware(
          m,
          // Check if this is the last valid middleware (not the statusCode arg)
          m === lastMiddleware
            ? { statusCode, validateSchema }
            : undefined,
        )
      : m,
  );
};
