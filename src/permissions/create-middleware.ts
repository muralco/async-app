import { decorate } from '../decorate';
import { forbidden } from '../error';
import { Entities } from '../types';
import getArgumentObjKeys from './get-argument-obj-keys';
import toString from './to-string';
import { CanItem, Mapping, PermissionFn } from './types';

const mapKey = <TEntities, K extends keyof TEntities>(
  mapping: Mapping<TEntities>,
  modelKey: K,
): string =>
  `${mapping[modelKey] || modelKey}`;

export const createPermissionFor = <TEntities extends Entities>(
  validator: PermissionFn<TEntities>,
  permission: string,
): CanItem<TEntities> => {
  const expectedModels = getArgumentObjKeys(validator);

  const fn = (mapping: Mapping<TEntities> = {}) => decorate<TEntities>(
    {
      $permission: permission,
      $requires: expectedModels.map(key => mapKey(mapping, key)),
    },
    (req, _, next) => {
      const args = {} as TEntities;

      expectedModels.forEach((key) => {
        const modelKey = mapKey(mapping, key);
        if (!req.hasOwnProperty(modelKey)) {
          throw new Error(`
            Permission "${permission}" middleware expected \`req.${modelKey}\`
            to be defined. Consider adding a \`load.${key}.fromX\` middleware
            before "${permission}".
          `);
        }

        args[key] = (req as any)[modelKey];
      });

      if (validator(args)) return next();

      throw forbidden(toString(permission));
    },
  );

  return fn as CanItem<TEntities>;
};
