import {
  ArgumentOption,
  CompileSchema,
  Context,
  Entities,
  GenerateSchemaErrorFn,
  isSchema,
  Middleware,
  RequestScope,
  Scope,
  ValidateSchema,
} from './types';

export const METHOD_SOURCE_MAP: { [key: string]: Scope } = {
  delete: 'query',
  get: 'query',
  patch: 'body',
  post: 'body',
  put: 'body',
};

const defaultGenerateError: GenerateSchemaErrorFn = ([error], source) => ({
  error: 'INVALID_PAYLOAD',
  expected: error.expected,
  path: error.key,
  source,
});

const createMiddleware = <TEntities extends Entities>(
  validate: ValidateSchema,
  generateError: GenerateSchemaErrorFn,
  source: RequestScope,
  context: Context,
): Middleware<TEntities> =>
    (req, res, next) => {
      const realSource = source || METHOD_SOURCE_MAP[req.method.toLowerCase()];
      const data = req[realSource];

      const schemaErrors = validate(data);

      if (schemaErrors.length) {
        res.status(400).send(
          generateError(schemaErrors, realSource, {
            ...context,
            req,
          }),
        );
        return;
      }

      return next();
    };

export default <TEntities extends Entities, TSchema>(
  compileSchema: CompileSchema<TSchema>,
  generateError = defaultGenerateError,
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
    compileSchema(schema.$schema || schema, context),
    generateError,
    source,
    context,
  );

  schemaMiddleware.$noOrder = true;

  return [schemaMiddleware, ...middlewares];
};
