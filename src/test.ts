import { deepEqual } from 'assert';
import pickledCucumber, { SetupFn } from 'pickled-cucumber';
import httpSupertest from 'pickled-cucumber/http/supertest';
import supertest from 'supertest';
import advancedApp from './examples/advanced/app';
import { DB } from './examples/advanced/db';
import { entities } from './examples/advanced/test';
import orderMiddlewares from './order';
import { Decorator, Middleware } from './types';

type App = typeof advancedApp;
type Mid = Middleware<any> & { $name?: string };
interface MidMap {
  [name: string]: Mid;
}

function clearRequireCache() {
  Object.keys(require.cache).forEach((key) => {
    delete require.cache[key];
  });
}

const setup: SetupFn = ({
  compare,
  getCtx,
  Given,
  setCtx,
  Then,
  When,
  onTearDown,
}) => {
  // === App setup === //
  Given('app setting "(.*)" is enabled', (setting) => {
    const app = getCtx<App>('$app');
    app.enable(setting);

    onTearDown(() => {
      app.disable(setting);
    });
  });

  // === Order ============================================================== //
  const addMiddleware = (name: string, attrs: Decorator) => {
    const ms = getCtx<MidMap>('$middlewares') || {};
    const middleware = (() => {}) as Mid;
    middleware.$name = name;
    Object.assign(middleware, attrs);
    ms[name] = middleware;
    setCtx('$middlewares', ms);
  };

  Given(
    'a loader "{word}" that provides {strings}(?: and requires {strings})?',
    (name, provides, requires) =>
      addMiddleware(name, {
        $provides: JSON.parse(provides),
        $requires: JSON.parse(requires || '[]'),
      }),
  );
  Given('a permission "{word}" that requires (.*)', (name, deps) =>
    addMiddleware(name, {
      $permission: name,
      $requires: JSON.parse(deps),
    }),
  );
  Given('an? (basic|advanced) app', app => setCtx('$app', app));
  When('ordering (.*)', (mids) => {
    const original = JSON.parse(mids) as string[];
    setCtx('$original', original);
    const map = getCtx<MidMap>('$middlewares');
    const sorted = orderMiddlewares()(
      original.map(o => map[o]),
      { method: 'post' },
    );
    setCtx(
      '$sorted',
      sorted.map(m => (m as Mid).$name || ''),
    );
  });
  When('analyzing the current app', () => {
    // We need to do this so all the imported apps are reimported with the
    // correct instrumentation for the analyze function.
    clearRequireCache();
    const analyze = require('./analyze').default;
    const routes = analyze(
      getCtx('$app') === 'advanced'
        ? () => require('./examples/advanced/app').default
        : () => require('./examples/basic/app').default,
    );
    setCtx('$routes', routes);
  });
  Then('the order of the middlewares remains unchanged', () =>
    deepEqual(getCtx('$sorted'), getCtx('$original')),
  );
  Then('the ordered middlewares are (.*)', expected =>
    deepEqual(getCtx('$sorted'), JSON.parse(expected)),
  );
  Then(
    'the analyzed routes {op}',
    (op, expected) => {
      compare(op, getCtx('$routes'), expected);
    },
    { inline: true },
  );
  // === Advanced example =================================================== //
  Then('the DB {op}', (op, expected) => compare(op, DB, expected), {
    inline: true,
  });
};

pickledCucumber(setup, {
  aliases: {
    strings: /\[[^\]]*\]/,
  },
  entities,
  http: httpSupertest(supertest(advancedApp) as any),
  initialContext: () => ({
    $app: advancedApp,
  }),
  usage: true,
});
