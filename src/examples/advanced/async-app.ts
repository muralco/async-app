// +========================================================================+ //
// | This file replaces `express`, that is, whenever you import or require  | //
// | express, you should import or require this file instead.               | //
// |                                                                        | //
// | Note: we are not exporting Express' static stuff so you might still    | //
// | need to import `express`, but not for creating routers.                | //
// |                                                                        | //
// | Note: we are also defining here some types and type aliases that will  | //
// | help us in specifing middlewares later.                                | //
// +========================================================================+ //

import { parseSchema, Type } from 'mural-schema';
import { ToDo, User } from './db';

// In your case this is `from 'async-app'`
import createApp, {
  Entities,
  internalServerError,
  Req as Request } from '../..';
import { ErrorHandlerFn, GenerateSchemaErrorFn } from '../../types';

// This type represents all the custom `req` keys that we could have, in this
// example those are `res.user` and `req.todo`.
export interface ExampleEntities extends Entities {
  user: User;
  todo: ToDo;
}

// This type helps us write middlewares that explicitly declare which custom
// keys from `req` they are going to use (e.g. `(req: Req<'user'>) => req.user`)
export type Req<T extends keyof ExampleEntities = '_'> = Request<
  ExampleEntities,
  T
>;

export { ErrorHandlerFn } from '../..';

// Custom schema validation error function. Conditionally includes a field in
// the response which contains all the validation errors, based on a request
// header.
const generateSchemaErrorFn: GenerateSchemaErrorFn = (
  errors,
  source,
  context,
) => {
  const { req } = context;
  const includeAll = req && !!req.headers['x-include-all-schema-errors'];

  return {
    all: includeAll ? errors : undefined,
    error: 'INVALID_PAYLOAD',
    expected: errors[0].expected,
    path: errors[0].key,
    source,
  };
};

// This function replaces `express()` as in `const app = express()`;
export default (errorHandlerFn?: ErrorHandlerFn<ExampleEntities>) =>
  createApp<ExampleEntities, Type>({
    // In here you specify additional `async-app` options...

    // The following line enables schema validation using `mural-schema`. Note
    // that you can easily change your schema validation module by specifing add
    // different `compileSchemaFn`.
    compileSchemaFn: schema => parseSchema(schema),
    errorHandlerFn,
    // The following line registers a function that maps schema validation
    // errors to an error response payload. When not specified, async-app uses a
    // built-in schema validation error function.
    generateSchemaErrorFn,
    mapAsyncResultFn: async (value, { req, ...opts }) => {
      if (value !== 'echo') return value;

      if (req.query.throw) {
        if (!opts.isLastMiddleware) throw internalServerError('NOT_LAST');

        if (!opts.isAsyncMiddleware) throw internalServerError('NOT_ASYNC');
      }

      return {
        ...opts,
        method: req.method,
        path: req.path,
      };
    },
  });
