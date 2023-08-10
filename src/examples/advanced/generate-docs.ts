import { writeFileSync } from 'fs';
import { Type } from 'mural-schema';
import toJsonSchema from 'mural-schema/to-jsonschema';
import { join } from 'path';

import analyze, { removeScope } from '../../analyze';
import toSwagger from '../../swagger';
import { port } from '../common';

const routes = analyze<any, Type>(() => require('./app').default);

const { paths, tags } = toSwagger(routes, {
  deprecated: 'in-use',
  generateSchema: schema => toJsonSchema(removeScope(schema)),
  getCategory: route => route.deprecated
    ? 'deprecated'
    : route.path.substring(1).split('/')[0],
});

const swagger = {
  basePath: '/',
  host: `localhost:${port}`,
  info: {
    title: 'Advanced example API',
    version: '1.0.0',
  },
  paths,
  schemes: 'http',
  swagger: '2.0',
  tags,
};

const content = JSON.stringify(swagger, undefined, 2);

writeFileSync(
  join(__dirname, '../../../src/examples/advanced/docs/swagger.json'),
  content,
);
