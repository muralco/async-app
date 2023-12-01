// +========================================================================+ //
// | This file defines declarative middlewares assert permissions           | //
// +========================================================================+ //

// In your case this is `from 'async-app'`
import { createPermissions } from '../..';
import { ReasonCodes } from '../..';
import { ExampleEntities } from './async-app';

const can = createPermissions<ExampleEntities>({
  todo: {
    view: ({ user, todo }) => ({ allowed: todo.owner === user.username, reason: ReasonCodes.Permission })
  },
});

export default can;
