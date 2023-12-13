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
import { CustomError } from '../error';

interface Permissions {
  [name: string]: boolean;
}

interface Reasons {
  [name: string]: string;
}

interface PermissionsWithReasons {
  [name: string]: boolean | Reasons;
}

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
    return { access: false, reason: error instanceof CustomError ? error.error : 'UNKNOWN_ERROR' };
  }
};

const assertEntity = <TEntities>(
  entity: PermissionEntity<TEntities> | undefined,
  entityName: keyof TEntities,
): PermissionEntity<TEntities> => {
  if (!entity) throw new Error(`Invalid entity ${entityName}`);
  return entity;
};

export const computePermissions = <TEntities>(
  entities: PermissionMap<TEntities>,
  entityName: keyof TEntities,
  requiredModels: TEntities,
  provideReasons = false,
): PermissionsWithReasons => {
  const entity = assertEntity(entities[entityName], entityName);

  checkExpectedModels(entity, entityName, requiredModels);

  const permissions = {} as Permissions;
  const reasons = {} as Reasons;

  Object.keys(entity).forEach((action) => {
    const spec = entity[action];

    // load permission on entire entity, e.g.: $permissions.delete = true
    if (isPermissionFn(spec)) {
      const { access , reason } = tryPermission(spec, requiredModels);
      permissions[action] = access;
      if (reason) {
        reasons[action] = reason;
      }
    }

    // load subpermissions, e.g.: $permissions['delete.editHash'] = true
    if (isPermissionEntity(spec)) {
      Object.keys(spec).forEach((subaction) => {
        const permissionFn = spec[subaction];
        if (isPermissionFn(permissionFn)) {
          const { access, reason } = tryPermission(permissionFn, requiredModels);

          permissions[`${action}.${subaction}`] = access;
          if (reason) {
            reasons[`${action}.${subaction}`] = reason;
          }
        }
      });
    }
  });

  return provideReasons ? {...permissions, '$reasons': reasons } : permissions;
};
