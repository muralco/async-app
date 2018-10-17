import { mapValues } from 'lodash';
import { Entities, Middleware } from '../types';
import { createPermissionFor } from './create-middleware';
import {
  Can,
  CanAction,
  CanItem,
  isPermissionEntity,
  isPermissionFn,
  PermissionEntity,
  PermissionMap,
} from './types';
import { getKeys } from './util';

const permissionContainer = <TEntities extends Entities>(
  permission: string,
): CanItem<TEntities> => {
  const fn = ((): Middleware<TEntities> => {
    throw new Error(
      `Invalid permission: \`${permission}\`, this is just a a container`,
    );
  }) as CanItem<TEntities>;
  fn.$container = true;
  return fn;
};

export const createPermissions = <TEntities extends Entities>(
  entities: PermissionMap<TEntities>,
): Can<TEntities> => {
  const can = {} as Can<TEntities>;

  getKeys(entities).forEach((entityName) => {
    const entity = entities[entityName];

    mapValues(entity, (spec1, action) => {

      const spec = spec1 as PermissionEntity<TEntities>;

      // load permission on entire entity, e.g.: `can.view.mural`
      const canAction = can[action]
        || (can[action] = {} as any as CanAction<TEntities>);

      const permission = `${entityName}.${action}`;

      const canItem: CanItem<TEntities> = isPermissionFn(spec)
        ? createPermissionFor(spec, permission)
        : permissionContainer(permission);
      canAction[entityName] = canItem;

      // load subpermissions, e.g.: `can.manage.mural.editHash`
      if (isPermissionEntity(spec)) {
        mapValues(spec, (subspec, subaction) => {
          if (isPermissionFn(subspec)) {
            canItem[subaction] = createPermissionFor(
              subspec,
              `${entityName}.${action}.${subaction}`,
            );
          }
        });
      }
    });
  });

  return can;
};
