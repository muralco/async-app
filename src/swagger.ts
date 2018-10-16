import {
  flattenDeep,
  groupBy,
  partition,
  uniq,
} from 'lodash';
import { Route } from './analyze';

interface RouteWithCat<TSchema> extends Route<TSchema> {
  category: string;
}

interface Options<TSchema> {
  deprecated?: 'all' | 'in-use' | 'none';
  generatePermissions?: (permissions: string[]) => string;
  generateSchema?: (schema: TSchema) => any;
  getCategory?: (route: Route<TSchema>) => string | undefined;
  getParamAlias?: (param: string) => string | undefined;
}

type GetAlias = Options<any>['getParamAlias'];

const expandTemplates = (getAlias: GetAlias, s: string) => (s
  ? s.replace(/:(\w+)/g, (_, p) => `{${(getAlias && getAlias(p)) || p}}`)
  : s
);

const defaultGeneratePermissions = (permissions: string[]) => {
  if (!permissions.length) return '';
  return `
  ### Permissions

  ${permissions.map(p => `- ${p}\n`).join('')}

  `;
};

const wrapSchema = (schema: any) =>
  schema
    ? [{
      in: 'body',
      name: 'body',
      required: true,
      schema,
    }]
    : undefined;

const generateEndpoint = <TSchema>(
  {
    generatePermissions = defaultGeneratePermissions,
    generateSchema,
    getParamAlias,
  }: Options<TSchema>,
  {
    method,
    path,
    category,
    deprecated,
    description,
    permissions,
    summary,
    schema,
    successStatus,
  }: RouteWithCat<TSchema>,
) => ({
  consumes: ['application/json'],
  deprecated,
  description: expandTemplates(
    getParamAlias,
    `${description}${generatePermissions(permissions)}`,
  ),
  operationId: `${method}${path}`.replace(/\W+/g, '-'),
  parameters:
    schema
    && generateSchema
    && wrapSchema(generateSchema(schema)),
  produces: ['application/json'],
  responses: {
    [successStatus]: { description: 'Success' },
  //   400: { description: 'Invalid payload' },
  },
  summary: expandTemplates(getParamAlias, summary),
  tags: [category],
});

const showRoute = <TSchema>(
  allowDeprecated: Options<TSchema>['deprecated'] = 'in-use',
) => (r: Route<TSchema>) =>
  !r.deprecated
  || (r.deprecated === 'in-use' && allowDeprecated !== 'none')
  || (allowDeprecated === 'all');

export default <TSchema>(
  routes: Route<TSchema>[],
  opts: Options<TSchema> = {},
) => {
  const routesWithCat = routes.map((r) => {
    return {
      ...r,
      category: opts.getCategory && opts.getCategory(r) || 'misc',
    };
  });
  const groups = groupBy(routesWithCat, 'category');
  const [proper, misc] = partition(Object.values(groups), v => v.length > 1);

  const finalRoutes = [
    ...flattenDeep(proper),
    ...flattenDeep(misc).map(r => ({ ...r, category: 'misc' })),
  ].filter(showRoute(opts.deprecated));

  const cats = uniq(finalRoutes.map(r => r.category))
    .sort()
    .filter(c => c !== 'misc' && c !== 'deprecated');
  const paths = finalRoutes.reduce(
    (acc, route) => {
      const spath = expandTemplates(opts.getParamAlias, route.path.toString());
      const pathEntry = acc[spath] || (acc[spath] = {});
      pathEntry[route.method] = generateEndpoint(opts, route);
      return acc;
    },
    {} as { [path: string]: { [method: string]: any }},
  );
  return {
    paths,
    tags: [
      ...cats.map(c => ({ name: c })),
      { name: 'misc' },
      { name: 'deprecated' },
    ],
  };
};
