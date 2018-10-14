import {
  AsyncMiddleware,
  CommonMiddleware,
  CompileSchema,
  Converter,
  Entities,
  isAsyncMiddleware,
  isMiddleware,
  isNumber,
  isPromise,
  isSchema,
  ValidateSchema,
} from './types';

const DEFAULT_STATUS_CODE = 200;

type Options = {
  statusCode: number;
  validateSchema?: ValidateSchema;
};

const mapMiddleware = <
  TEntities extends Entities,
>(
  asyncMiddleware: AsyncMiddleware<TEntities>,
  options?: Options,
): CommonMiddleware<TEntities> => {
  const fn: CommonMiddleware<TEntities> = (req, res, next) => {
    // First we run the middleware as usual
    const promiseOrVoid = asyncMiddleware(req);

    if (typeof options === 'undefined' || req.method === 'USE') {
      // `USE` middlewares never return stuff, so there is no need for us to
      // attempt to process the result. `options` is only passed to the last
      //  middleware, if this is not the last middleware, continue with next one
      return next();
    }

    const promise = isPromise(promiseOrVoid)
      ? promiseOrVoid
      : Promise.resolve(promiseOrVoid);

    return promise
      .then((val) => {
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
      })
      .catch(next);
  };

  // Keep the $ vars.
  fn.$noOrder = asyncMiddleware.$noOrder;
  fn.$permission = asyncMiddleware.$permission;
  fn.$provides = asyncMiddleware.$provides;
  fn.$requires = asyncMiddleware.$requires;

  return fn;
};

// If any argument is a 1 arg function (i.e. a middleware without
// `res & next`), then we map it because it could be an async middleware
export default <TEntities extends Entities, TSchema>(
  compileSchema?: CompileSchema<TSchema>,
): Converter<TEntities, TSchema> => (args, context) => {
  const statusCode = args.find(isNumber) || DEFAULT_STATUS_CODE ;
  const schema = args
    .filter(isSchema<TSchema>())
    .find(s => s.$scope === 'response');
  const validateSchema = compileSchema
    && schema
    && compileSchema(schema, context);

  const middlewares = args.filter(isMiddleware);
  const lastMiddleware = middlewares[middlewares.length - 1];

  return args
    .map((m) => {
      // Check if this is the last valid middleware (not the statusCode arg)
      const withResp = m === lastMiddleware;

      if (isAsyncMiddleware(m)) {
        return mapMiddleware(
          m,
          withResp ? { statusCode, validateSchema } : undefined,
        );
      }

      return m;
    });
};
