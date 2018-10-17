// +========================================================================+ //
// | This file defines declarative middlewares to load models into `req`    | //
// +========================================================================+ //

// In your case this is `from 'async-app'`
import { loadWith } from '../..';
import { ExampleEntities } from './async-app';
import { getTodo, getUser } from './db';

const loadTodo = loadWith<ExampleEntities, 'todo', 'id'>(
  getTodo,
  todo => todo.id,
);
const loadUser = loadWith<ExampleEntities, 'user', 'username'>(
  getUser,
  user => user.username,
);

const load = {
  todo: {
    fromParams: (paramName = 'todoId') =>
      loadTodo(req => req.params[paramName], 'todo'),
  },
  user: {
    fromParams: (paramName = 'username') =>
      loadUser(req => req.params[paramName], 'user'),
  },
};

export default load;
