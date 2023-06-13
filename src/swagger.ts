import {
  flattenDeep,
  groupBy,
  isPlainObject,
  partition,
  uniq,
} from 'lodash';
import { Route } from './analyze';
import { METHOD_SOURCE_MAP } from './schema';
import { Schema } from './types';

interface RouteWithCat<TSchema> extends Route<TSchema> {
  category: string;
}

interface Options<TSchema> {
  deprecated?: 'all' | 'in-use' | 'none';
  generatePermissions?: (permissions: string[]) => string;
  generateSchema?: (schema: TSchema) => any;
  getCategory?: (route: Route<TSchema>) => string | undefined;
  getParamAlias?: (param: string) => string | undefined;
  sortCategories?: (a: string, b: string) => number;
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

const isQuerySchema = (schema: any, method: string) =>
  schema &&
  ((schema as Schema).$scope || METHOD_SOURCE_MAP[method]) === 'query';

const wrapBodySchema = (schema: any) =>
  schema
    ? [{
      in: 'body',
      name: 'body',
      required: true,
      schema,
    }]
    : undefined;

const wrapQuerySchema = (schema: any) =>
  (isPlainObject(schema) && schema.properties)
    ? Object.entries<Record<string, any>>(schema.properties)
        .map(([key, value]) => ({
          in: 'query',
          name: key,
          type: value.enum ? 'string' : value.type,
          ...(value.enum ? { enum: value.enum } : undefined),
        }))
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
    responseSchema,
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
    && (isQuerySchema(schema, method) ? wrapQuerySchema : wrapBodySchema)(
      generateSchema(schema),
    ),
  produces: ['application/json'],
  responses: {
    [successStatus]: {
      description: 'Success',
      schema:
        responseSchema && generateSchema && generateSchema(responseSchema),
    },
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

const defaultSortCategories = (a: string, b: string): number => {
  if (a === 'deprecated') return 1;
  if (b === 'deprecated') return -1;
  if (a === 'misc') return 1;
  if (b === 'misc') return -1;
  return a < b ? -1 : 1;
};

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

  const paths = finalRoutes.reduce(
    (acc, route) => {
      const spath = expandTemplates(opts.getParamAlias, route.path.toString());
      const pathEntry = acc[spath] || (acc[spath] = {});
      pathEntry[route.method] = generateEndpoint(opts, route);
      return acc;
    },
    {} as { [path: string]: { [method: string]: any }},
  );

  const cats = uniq(finalRoutes.map(r => r.category))
    .sort(opts.sortCategories || defaultSortCategories);

  return {
    paths,
    tags: cats.map(c => ({ name: c })),
  };
};
