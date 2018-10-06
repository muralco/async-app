import {
  ArgumentOption,
  AsyncMiddleware,
  CommonMiddleware,
  CompileSchema,
  isAsyncMiddleware,
  isMiddleware,
  isNumber,
  isPromise,
  isSchema,
  ValidateSchema,
} from '../types';

const DEFAULT_STATUS_CODE = 200;

type Options = {
  statusCode: number;
  validateSchema?: ValidateSchema;
};

const mapMiddleware = (
  asyncMiddleware: AsyncMiddleware,
  options?: Options,
): CommonMiddleware => {
  const fn: CommonMiddleware = (req, res, next) => {
    const promise = asyncMiddleware(req);
    // A middleware with two args might be just a handler that calls res.send
    // but does not return a promise...
    if (!isPromise(promise)) return;

    if (req.method === 'USE') return next();

    return promise
      .then((val) => {
        // options is only passed to the last middleware,
        // if this is not the last middleware, continue with next one
        if (typeof options === 'undefined') return next();
        if (res.headersSent) return;

        // There is no schema to validate. :sigasiga:
        if (!options.validateSchema) {
          res.status(options.statusCode).json(val || {});
          return;
        }

        // Lets validate that schema.
        const result = options.validateSchema(val);

        if (result && result.error) {
          const response = {
            ...result.error,
            error: 'INVALID_SCHEMA_RESPONSE',
          };

          res.status(400).send(response);
          return;
        }

        // Siga siga
        res.status(options.statusCode).json(val || {});
        return;
      })
      .catch(next);
  };

  // Keep the $ vars.
  fn.$provides = asyncMiddleware.$provides;
  fn.$requires = asyncMiddleware.$requires;
  fn.$permission = asyncMiddleware.$permission;

  return fn;
};

// If any argument is a 1 arg function (i.e. a middleware without
// `res & next`), then we map it because it could be an async middleware
const asyncConverter = (compileSchema?: CompileSchema) => (
  args: ArgumentOption[],
) => {
  const statusCode = args.find(isNumber) || DEFAULT_STATUS_CODE ;
  const schema = args.filter(isSchema).find(s => !!s.$response);
  const validateSchema = compileSchema && schema && compileSchema(schema);
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

export default asyncConverter;
