// +========================================================================+ //
// | This file defines declarative middlewares to load models into `req`    | //
// +========================================================================+ //

// In your case this is `from 'async-app'`
import { decorate, notFound, provides } from '../..';
import { ExampleEntities } from './async-app';
import { getTodo, getTodosForUser, getUser } from './db';

const load = {
  todo: {
    fromParams: () => decorate<ExampleEntities>(
      { $provides: ['todo'] },
      async (req, _, next) => {
        const todo = await getTodo(parseInt(req.params.id, 10));
        if (!todo) throw notFound('TODO_NOT_FOUND');
        req.todo = todo;
        next();
      },
    ),
  },
  todos: {
    formUser: () => decorate<ExampleEntities>(
      { $provides: ['todos'], $requires: ['user'] },
      async (req, _, next) => {
        req.todos = await getTodosForUser(req.user.username) || [];
        next();
      },
    ),
  },
  user: {
    fromParams: () => provides<ExampleEntities>(
      ['user'],
      async (req, _, next) => {
        const user = await getUser(req.params.username);
        if (!user) throw notFound('USER_NOT_FOUND');
        req.user = user;
        next();
      },
    ),
  },
};

export default load;
