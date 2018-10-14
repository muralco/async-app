import {
  ArgumentOption,
  CompileSchema,
  Context,
  Entities,
  isSchema,
  Middleware,
  RequestScope,
  Scope,
  ValidateSchema,
} from './types';

const METHOD_SOURCE_MAP: { [key: string]: Scope } = {
  delete: 'query',
  get: 'query',
  patch: 'body',
  post: 'body',
  put: 'body',
};

const createMiddleware = <TEntities extends Entities>(
  validate: ValidateSchema,
  source: RequestScope,
): Middleware<TEntities> =>
    (req, res, next) => {
      const realSource = source || METHOD_SOURCE_MAP[req.method.toLowerCase()];
      const data = req[realSource];

      const schemaErrors = validate(data);

      if (schemaErrors.length) {
        const response = {
          error: 'INVALID_PAYLOAD',
          path: schemaErrors[0].key,
          source: realSource,
        };

        res.status(400).send(response);
        return;
      }

      return next();
    };

export default <TEntities extends Entities, TSchema>(
  compileSchema: CompileSchema<TSchema>,
) => (
  middlewares: ArgumentOption<TEntities, TSchema>[],
  context: Context,
): ArgumentOption<TEntities, TSchema>[] => {
  const schema = middlewares
    .filter(isSchema<TSchema>())
    .find(s => s.$scope !== 'response');

  if (!schema) return middlewares;

  const source = schema.$scope || METHOD_SOURCE_MAP[context.method];

  if (source === 'response') return middlewares;

  const schemaMiddleware = createMiddleware<TEntities>(
    compileSchema(schema, context),
    source,
  );

  schemaMiddleware.$noOrder = true;

  return [schemaMiddleware, ...middlewares];
};
