import { difference, flatten, partition } from 'lodash';

import {
  ArgumentOption,
  Context,
  Entities,
  isMiddleware,
  isNonOrderable,
  isPermissionMiddleware,
  isProviderMiddleware,
  isSchema,
  Middleware,
  ProviderMiddleware,
} from './types';

interface ProviderMap<TEntities extends Entities> {
  [model: string]: ProviderMiddleware<TEntities>;
}

const isString = (a: unknown): a is string => typeof a === 'string';

const createProviderMap = <TEntities extends Entities>(
  middlewares: Middleware<TEntities>[],
) =>
   middlewares
    .filter(isProviderMiddleware)
    .reduce(
      (acc, m) => {
        const mNeeds = (m.$requires || []).length;

        m.$provides.forEach((model) => {
          const current = acc[model];
          // We always keep the provider with least requirements

          // Note: this can be improved by keeping the provider with a shorter
          // dependency path. Right now if a -> [x, y], b -> [z] we'll keep
          // `b`, even if `z` depends on a million things and `x` and `y` don't
          // depend on anything.
          acc[model] = (!current || (current.$requires || []).length > mNeeds)
            ? m
            : current;
        });

        return acc;
      },
      {} as ProviderMap<TEntities>,
    );

const printBrokenMiddleware = <TEntities extends Entities>({
  $permission,
  $provides,
  $requires,
}: Middleware<TEntities>) =>
  JSON.stringify({ $permission, $provides, $requires });

const findRequirementsAcyclic = <TEntities extends Entities>(
  pmap: ProviderMap<TEntities>,
  m: Middleware<TEntities>,
  existing: Middleware<TEntities>[],
  context: Context,
): Middleware<TEntities>[] => {
  if (existing.includes(m)) {
    throw new Error(`Error in \`${context.method} ${context.path}\`:

    Cyclic middleware dependency found!

    The cycle triggers when trying to add:
    ${printBrokenMiddleware(m)}

    To:
    ${existing.map(printBrokenMiddleware).join('\n    ')}
    `);
  }
  if (!m.$requires || !m.$requires.length) return [m];
  const allProviders = flatten(m.$requires.map(model => pmap[model]));

  const [withRequirements, withoutRequirements] = partition(
    allProviders,
    p => p.$requires && p.$requires.length,
  );

  const newExisting = [
    ...existing,
    ...withoutRequirements,
    m,
  ];

  return [
    ...withoutRequirements,
    ...flatten(
      withRequirements.map(p =>
          findRequirementsAcyclic(pmap, p, newExisting, context)),
    ),
    m,
  ];
};

const findRequirements = <TEntities extends Entities>(
  pmap: ProviderMap<TEntities>,
  m: Middleware<TEntities>,
  context: Context,
): Middleware<TEntities>[] =>
  findRequirementsAcyclic(pmap, m, [], context);

export default <TEntities extends Entities, TSchema>() => (
  args: ArgumentOption<TEntities, TSchema>[],
  context: Context,
) => {
  // Split arguments to organize them by type
  const strings = args.filter(isString);
  const objects = args.filter(isSchema());
  const functions = args.filter(isMiddleware);

  // Split functions to handle loaders and permissions separately
  const [noOrder, middlewares] = partition(functions, isNonOrderable);

  // Validate that every requirement is met
  const everythingRequired = flatten(
    middlewares.map(m => m.$requires || []),
  );
  const everythingProvided = flatten(
    middlewares.map(m => m.$provides || []),
  );
  const missing = difference(everythingRequired, everythingProvided);
  if (missing.length) {
    throw new Error(`Error in \`${context.method} ${context.path}\`:
      Missing required loader for: ${missing.join(', ')}.
    `);
  }

  // In here we'll drop the ordered middlewares. We start with the ones that
  // should not be ordered.
  const orderedMiddlewares: Middleware<TEntities>[] = [...noOrder];
  const addMiddleware = (m: Middleware<TEntities>) => {
    if (!orderedMiddlewares.includes(m)) {
      orderedMiddlewares.push(m);
    }
  };

  // The goal is to add permissions as soon as possible, but in order to add
  // them, we first need to satisfy their requirements.
  const providerMap = createProviderMap(middlewares);

  // We transform each permission into a list of middlewares required to inject
  // that permission, then sort them from least to most requirements
  const permissions = middlewares
    .filter(isPermissionMiddleware)
    .map(p => findRequirements(providerMap, p, context))
    .sort((a, b) => a.length - b.length);

  // Lets do this...
  permissions.forEach((middlwareList) => {
    middlwareList.forEach(addMiddleware);
  });

  // Now that that is taken care of, we need to add all the remaining
  // middlewares and since `addMiddleware` avoids dups, we can just go ahead
  // re-add everything
  middlewares.forEach(addMiddleware);

  const ms = [
    ...strings,
    ...objects,
    ...orderedMiddlewares,
  ].filter(m => !!m);

  return ms;
};
