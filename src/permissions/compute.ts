import { uniq } from 'lodash';
import getArgumentObjKeys from './get-argument-obj-keys';
import {
  isPermissionEntity,
  isPermissionFn,
  PermissionEntity,
  PermissionFn,
  PermissionMap,
} from './types';
import { getKeys } from './util';

type Permissions<T extends string = string> = {
  [key in T]: key extends '$errors' ? Record<string, unknown> : boolean;
} & {
  $errors: Record<string, unknown>;
};

const areEqual = <T>(arr1: T[], arr2: T[]) =>
  arr1.length === arr2.length && arr1.every(item => arr2.includes(item));

const checkExpectedModels = <TEntities>(
  entity: PermissionEntity<TEntities>,
  entityName: keyof TEntities,
  models: TEntities,
) => {
  const expectedAll = [] as (keyof TEntities)[];

  getKeys(entity).forEach((action) => {
    const spec = entity[action];
    if (isPermissionFn(spec)) {
      expectedAll.push(...getArgumentObjKeys(spec));
    }

    if (isPermissionEntity(spec)) {
      Object.keys(spec).forEach((subaction) => {
        const subspec = spec[subaction];
        if (isPermissionFn(subspec)) {
          expectedAll.push(...getArgumentObjKeys(subspec));
        }
      });
    }
  });

  const given = getKeys(models).filter(model => !!models[model]);
  const expected = uniq(expectedAll);

  if (!areEqual(given, expected)) {
    throw new Error(`Wrong expected models for "${entityName}".
      Expected: ${expected.join(', ')};
      Given: ${given.join(', ')}.`);
  }
};

const tryPermission = <TEntities>(
  permissionFn: PermissionFn<TEntities>,
  requiredModels: TEntities,
) => {
  try {
    return { access: permissionFn(requiredModels) };
  } catch (error) {
    return { access: false, error };
  }
};

const assertEntity = <TEntities>(
  entity: PermissionEntity<TEntities> | undefined,
  entityName: keyof TEntities,
): PermissionEntity<TEntities> => {
  if (!entity) throw new Error(`Invalid entity ${entityName}`);
  return entity;
};

// Accepting an optional tryFunction lets users override the default try/catch
// which means you can in theory pull off the `extra` key in thrown errors etc
export const computePermissions = <TEntities>(
  entities: PermissionMap<TEntities>,
  entityName: keyof TEntities,
  requiredModels: TEntities,
): Permissions => {
  const entity = assertEntity(entities[entityName], entityName);

  checkExpectedModels(entity, entityName, requiredModels);

  const permissions = {
    $errors: {},
  } as Permissions;

  Object.keys(entity).forEach((action) => {
    const spec = entity[action];

    // load permission on entire entity, e.g.: $permissions.delete = true
    if (isPermissionFn(spec)) {
      const { access, error } = tryPermission(spec, requiredModels);
      permissions[action] = access;

      if (error) {
        (permissions.$errors)[action] = error;
      }
    }

    // load subpermissions, e.g.: $permissions['delete.editHash'] = true
    if (isPermissionEntity(spec)) {
      Object.keys(spec).forEach((subaction) => {
        const permissionFn = spec[subaction];
        if (isPermissionFn(permissionFn)) {
          const { access, error } = tryPermission(permissionFn, requiredModels);
          const permKey = `${action}.${subaction}`;

          permissions[permKey] = access;

          if (error) {
            (permissions.$errors)[permKey] = error;
          }
        }
      });
    }
  });

  return permissions;
};
