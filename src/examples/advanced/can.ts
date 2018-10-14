// +========================================================================+ //
// | This file defines declarative middlewares assert permissions           | //
// +========================================================================+ //

// In your case this is `from 'async-app'`
import { decorate, forbidden } from '../..';
import { ExampleEntities, Req } from './async-app';

const can = {
  view: {
    todo: () => decorate<ExampleEntities>(
      { $permission: 'can.view.todo', $requires: ['todo', 'user'] },
      async (req: Req<'todo'|'user'>, _, next) => {
        if (req.todo.owner === req.user.username) next();
        throw forbidden('NOT_YOUR_TODO');
      },
    ),
  },
};

export default can;
