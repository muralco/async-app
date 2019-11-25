import createApp, { ErrorHandlerFn, ExampleEntities, Req } from './async-app';
import { addUser } from './db';
import load from './load';

const handleLoaderErrors: ErrorHandlerFn<ExampleEntities> =
  (err, _, res, __) => {
    const { statusCode, error, extra } = err;
    if (err.error === 'USER') {
      return res.status(400).send({ error: 'invalid_user', ...extra });
    }
    return res.status(statusCode || 500).send({ error, ...extra });
  };

const app = createApp(handleLoaderErrors);

app.post(
  '/',
  'Creates a user', // This is the summary string for the endpoint
  {
    // This is the expected schema of the body
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
  '/:username',
  'Returns the specified user',
  load.user.fromParams(),
  (req: Req<'user'>) => req.user,
);

export default app;
