// +========================================================================+ //
// | This file defines declarative middlewares to load models into `req`    | //
// +========================================================================+ //

// In your case this is `from 'async-app'`
import { loadOnceWith, loadWith, prioritize } from '../..';
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

const loadUserWith = loadOnceWith<ExampleEntities, 'user', 'username'>(
  user => user.username,
);

const load = {
  todo: {
    fromParams: (paramName = 'todoId') =>
      loadTodo(req => req.params[paramName], 'todo'),
  },
  user: {
    // Always have authorization loader first no matter the dependencies
    // among middlewares
    fromAuthorization: () =>
      prioritize(
        loadUser(
          req => req.headers && req.headers.authorization || '',
          'user',
        ),
      ),
    fromParams: (paramName = 'username') =>
      loadUser(req => req.params[paramName], 'user'),
    fromTodo: () => loadUserWith(
      req => getUser(req.todo.owner),
      req => req.todo.owner,
      'user',
      ['todo'],
    ),
  },
};

export default load;
