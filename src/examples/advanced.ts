import bodyParser from 'body-parser';
import { parseSchema } from 'mural-schema';
import { Type } from 'mural-schema/types';
import createApp, {
  decorate,
  Entities,
  provides,
  Req as Request,
} from '..';
import { runExample } from './common';

// +========================================================================+ //
// | This example is an in-memory TODO app that showcases most of the good  | //
// | stuff in `async-app`, including: documentation, success status, schema | //
// | validation, middleware ordering, TypeScript, etc.                      | //
// +========================================================================+ //

// --- App ------------------------------------------------------------------ //
// First we'll define some entities and types
interface ExampleEntities extends Entities {
  user: { username: string, name: string };
  todos: { owner: string; item: string; }[];
}
type Req<T extends keyof ExampleEntities = '_'> = Request<ExampleEntities, T>;

// Put this in some file somewhere
const thisReplacesExpress = () => createApp<ExampleEntities, Type>({
  compileSchemaFn: schema => parseSchema(schema),
});

// --- Loader middlewares --------------------------------------------------- //
// Now we'll define some middlewares...
export const DB: {
  todos: { [username: string]: ExampleEntities['todos'] };
  users: { [username: string]: ExampleEntities['user'] };
} = {
  todos: {},
  users: {},
};

// In a real-life app these middlewares should be async and you should place
// them somewhere else (e.g. a `loadeers` directory).
const loadUserFromParams = provides<ExampleEntities>(
  ['user'],
  (req, res, next) => {
    const user = DB.users[req.params.username];
    if (!user) {
      res.status(404).json({ error: 'USER_NOT_FOUND' });
      return;
    }

    req.user = user;
    next();
  },
);
const loadTodosForUser = decorate<ExampleEntities>(
  { $provides: ['todos'], $requires: ['user'] },
  (req, _, next) => {
    req.todos = DB.todos[req.user.username] || [];
    next();
  },
);

// --- Router (e.g. `app.js`/`app.ts`) -------------------------------------- //
// Then declare your `app` like `const app = require('./path/to/that/file;)();
const app = thisReplacesExpress();
app.use(bodyParser.json());

app.post(
  '/users',
  'Creates a user', // This is the summary string for the endpoint
  { // This is the expected schema of the body
    name: 'string',
    username: 'string',
  },
  (req: Req) => { DB.users[req.body.username] = req.body; },
  201, // A number specified the success status code
);

app.get(
  '/users/:username',
  'Returns the specified user',
  loadUserFromParams,
  (req: Req<'user'>) => req.user,
);

app.post(
  '/todos/:username',
  'Creates a TODO for the specified user',
  {
    item: 'string',
  },
  loadUserFromParams,
  loadTodosForUser,
  (req: Req<'user'|'todos'>) => {
    req.todos.push({ ...req.body, owner: req.user.username });
    DB.todos[req.user.username] = req.todos;
  },
  201,
);

app.get(
  '/todos/:username',
  'Returns the TODOs for the specified user',
  loadUserFromParams,
  loadTodosForUser,
  (req: Req<'todos'>) => req.todos,
);

app.get(
  '/dump',
  'Returns the whole DB',
  () => DB,
);

export default app;

// -------------------------------------------------------------------------- //
// And just to make this example runnable...
runExample(app, prefix => console.log(`Try:
  # Happy path
  curl -X POST ${prefix}/users -H 'Content-Type: application/json' \\
    -d '{"username": "j1", "name": "John" }' -sv 2>&1 | grep '< HTTP'
  curl ${prefix}/users/j1
  curl ${prefix}/todos/j1
  curl -X POST ${prefix}/todos/j1 -H 'Content-Type: application/json' \\
    -d '{ "item": "write some tests" }' -sv 2>&1 | grep '< HTTP'
  curl ${prefix}/todos/j1

  # Edges
  curl ${prefix}/users/invalid
  curl ${prefix}/todos/invalid

  `));
