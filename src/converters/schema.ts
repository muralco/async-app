import {
  ArgumentOption,
  CompileSchema,
  isSchema,
  methodsSourcesMap,
  Middleware,
  Scope,
  ValidateSchema,
} from '../types';

const createMiddleware =
  (validate: ValidateSchema, scope?: Scope): Middleware =>
    (req, res, next) => {
      const src = scope || methodsSourcesMap[req.method];
      const data = req[src];

      const schemaResult = validate(data);

      if (schemaResult && schemaResult.error) {
        const response = {
          ...schemaResult.error,
          error: 'INVALID_PAYLOAD',
          source: src,
        };

        res.status(400).send(response);
        return;
      }

      return next();
    };

const SchemaConverter = (compileSchema: CompileSchema) =>
  (middlewares: ArgumentOption[]): ArgumentOption[] => {
    const schema = middlewares.filter(isSchema).find(s => !s.$response);

    if (!schema) return middlewares;

    const schemaMiddleware = createMiddleware(
      compileSchema(schema),
      schema.$scope,
    );

    schemaMiddleware.$noOrder = true;

    return [schemaMiddleware, ...middlewares];
  };

export default SchemaConverter;
