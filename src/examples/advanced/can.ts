// +========================================================================+ //
// | This file defines declarative middlewares assert permissions           | //
// +========================================================================+ //

// In your case this is `from 'async-app'`
import { createPermissions } from '../..';
import { ExampleEntities } from './async-app';

const can = createPermissions<ExampleEntities>({
  todo: {
    view: ({ user, todo }) => todo.owner === user.username,
  },
});

export default can;
