// +========================================================================+ //
// | This file represents our main `app`, where we would define our         | //
// | endpoints, middlewares and sub-routers.                                | //
// +========================================================================+ //

import bodyParser from 'body-parser';
import express from 'express';
import { join } from 'path';

import { deprecate } from '../..';
import createApp, { Req } from './async-app';
import can from './can';
import { addTodo, addUser, getTodosForUser } from './db';
import load from './load';
import purgeUser from './purgeUser';

const app = createApp();
app.use(bodyParser.json());

// --- Deprecated ----------------------------------------------------------- //
app.get(
  '/deprecated',
  deprecate.endpoint,
  () => `we should remove this, but it's still in use :(`,
);

app.get(
  '/deprecated-for',
  deprecate.for('/not-deprecated'),
  () => `we should remove this, you should go there it's better`,
);

app.get(
  '/deprecated/todos/:username',
  deprecate.redirect(({ params }) => `/todos/${params.username}`),
);

// Note that deprecated endpoints must always appear before the endpoint they
// rewrite to.
app.get(
  '/deprecated/user/:username',
  deprecate.rewrite('GET', ({ params }) => `/users/${params.username}`),
);

// --- Users ---------------------------------------------------------------- //
app.post(
  '/users',
  'Creates a user', // This is the summary string for the endpoint
  { // This is the expected schema of the body
    name: 'string',
    username: 'string',
  },
  async (req: Req) => {
    const user = req.body;
    await addUser(user);
    return { username: user.username };
  },
  201, // A number specifies the success status code
);

app.get(
  '/users/:username',
  'Returns the specified user',
  load.user.fromParams(),
  (req: Req<'user'>) => req.user,
);

app.use('/users/purge', purgeUser);

// --- TODOs ---------------------------------------------------------------- //
app.post(
  '/todos/:username',
  'Creates a TODO for the specified user',
  {
    item: 'string',
  },
  load.user.fromParams(),
  async (req: Req<'user'>) => {
    const id = Math.random();
    await addTodo({
      ...req.body,
      id,
      owner: req.user.username,
    });
    return { id };
  },
  201,
);

app.get(
  '/todos/:username',
  'Returns the TODOs for the specified user',
  load.user.fromParams(),
  (req: Req<'user'>) => getTodosForUser(req.user.username),
);

app.get(
  '/todos/:username/:id',
  'Returns a TODO of the specified user',
  load.user.fromParams(),
  load.todo.fromParams(),
  can.view.todo(),
  (req: Req<'todo'>) => req.todo,
);

app.get(
  '/todos-by-id/:todoId',
  'Returns a TODO of the specified user',
  load.todo.fromParams(),
  load.user.fromTodo(),
  can.view.todo(),
  (req: Req<'todo'>) => req.todo,
);

app.get('/echo1', () => 'echo');

app.get('/echo2', () => 'echo', () => ({ last: true }));

app.get('/echo3', (_, res) => {
  setTimeout(() => {
    if (!res.headersSent) {
      res.send({ last: true });
    }
  },         0);
  return 'echo';
});

// --- Docs ----------------------------------------------------------- //
app.use(
  '/docs',
  express.static(join(__dirname, '../../../src/examples/advanced/docs')),
);

export default app;
