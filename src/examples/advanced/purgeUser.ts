import createApp, { ErrorHandlerFn, ExampleEntities, Req } from './async-app';
import { removeUser } from './db';
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

app.delete(
  '/:username',
  'Deletes a user',
  load.user.fromParams(),
  (req: Req<'user'>) => removeUser(req.user.username),
);

export default app;
