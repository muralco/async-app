
// +========================================================================+ //
// | This example is an in-memory TODO app that showcases most of the good  | //
// | stuff in `async-app`, including: documentation, success status, schema | //
// | validation, middleware ordering, TypeScript, etc.                      | //
// +========================================================================+ //

import { runExample } from '../common';
import app from './app';

runExample(app, prefix => console.log(`Try:
  # Happy path
  curl -X POST ${prefix}/users -H 'Content-Type: application/json' \\
    -d '{"username": "j1", "name": "John" }' -sv 2>&1 | grep '< HTTP'
  curl ${prefix}/users/j1
  curl ${prefix}/todos/j1
  curl -X POST ${prefix}/todos/j1 -H 'Content-Type: application/json' \\
    -d '{ "item": "write some tests" }' -sv 2>&1 | grep '< HTTP'
  curl ${prefix}/todos/j1

  # Edges
  curl ${prefix}/users/invalid
  curl ${prefix}/todos/invalid

  `));
