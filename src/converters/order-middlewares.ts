import { flatten } from 'lodash';

import {
  ArgumentOption,
  isMiddleware,
  isNonOrderable,
  isProviderMiddleware,
  isRequiredMiddleware,
  isSchema,
  Middleware,
  NonOrderableMiddleware,
  ProviderMiddleware,
  RequireMiddleware,
} from '../types';

type Acc = {
  noOrder: NonOrderableMiddleware[],
  loaders: ProviderMiddleware[],
  permissions: RequireMiddleware[],
  middlewares: Middleware[],
};

const isString = (a: ArgumentOption): a is string => typeof a === 'string';

const orderConverter = (
  args: ArgumentOption[],
) => {
  // Split arguments to organize them by type
  const strings = args.filter(isString);
  const objects = args.filter(isSchema);
  const functions = args.filter(isMiddleware);
  const orderedPermissionsAndLoaders: Middleware[] = [];

  // Split functions to handle loaders and permissions separately
  const { noOrder, loaders, permissions, middlewares } = functions.reduce(
    (acc: Acc, fn) => {
      if (isNonOrderable(fn)) {
        acc.noOrder.push(fn);
      } else if (isProviderMiddleware(fn)) {
        acc.loaders.push(fn);
      } else if (isRequiredMiddleware(fn)) {
        acc.permissions.push(fn);
      } else {
        acc.middlewares.push(fn);
      }
      return acc;
    },
    { noOrder: [], loaders: [], permissions: [], middlewares: [] },
  );

  const mapLoaders = flatten(
    loaders.map(loader =>
      loader.$provides.map(p => [p, loader]),
    ),
  ) as [string, ProviderMiddleware][];

  const loadersMap = new Map<string, ProviderMiddleware>(mapLoaders);

  const addLoader = (loader: Middleware) => {
    if (!orderedPermissionsAndLoaders.includes(loader)) {
      orderedPermissionsAndLoaders.push(loader);
    }
  };

  // For each permission, check if it requires any specific loader/s
  // Add required loader/s (if any) and permission to the new ordered list
  permissions.forEach((permission) => {
    permission.$requires
      // Map each middleware with its function
      .map((model) => {
        const loader = loadersMap.get(model);
        if (!loader) {
          throw new Error(`Permission "${permission.$permission}" requires
          "${model}" model but its loader is not provided.`);
        }
        return loader;
      })
      // Sort loaders to execute the ones that not depends on others.
      .sort((a, b) => {
        if (!a.$requires || !a.$requires.length) return -1;
        if (!b.$requires || !b.$requires.length) return 1;
        return a.$requires.length - b.$requires.length;
      })
      .forEach(addLoader);
    orderedPermissionsAndLoaders.push(permission);
  });

  // Add any missing loader that was not required by a permission
  loadersMap.forEach(addLoader);

  // Concat all arguments again and return new ordered list
  return [
    ...strings,
    ...objects,
    ...noOrder,
    ...orderedPermissionsAndLoaders,
    ...middlewares,
  ].filter(m => !!m);
};

export default orderConverter;
