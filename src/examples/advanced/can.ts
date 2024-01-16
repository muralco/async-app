// +========================================================================+ //
// | This file defines declarative middlewares assert permissions           | //
// +========================================================================+ //

// In your case this is `from 'async-app'`
import { createPermissions, CustomError } from '../..';
import { ExampleEntities } from './async-app';

const todo = {
  admin: ({ user, todo }: Pick<ExampleEntities, 'user' | 'todo'>) => {
    if (todo.owner === user.username) {
      return true;
    }
    throw new CustomError(401, 'NOT_AUTHORIZED');
  },
  view: ({ user, todo }: Pick<ExampleEntities, 'user' | 'todo'>) =>
    todo.owner === user.username,
};

export const entities = {
  todo,
};

const can = createPermissions<ExampleEntities>(entities);

export default can;
