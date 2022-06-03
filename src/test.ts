import { deepEqual } from 'assert';
import pickledCucumber, { SetupFn } from 'pickled-cucumber';
import httpSupertest from 'pickled-cucumber/http/supertest';
import supertest from 'supertest';
import advancedApp from './examples/advanced/app';
import { DB } from './examples/advanced/db';
import { entities } from './examples/advanced/test';
import orderMiddlewares from './order';
import { Decorator, Middleware } from './types';

type Mid = Middleware<any> & { $name?: string };
interface MidMap {
  [name: string]: Mid;
}

const setup: SetupFn = ({ compare, getCtx, Given, setCtx, Then, When }) => {
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
    // tslint:disable-next-line: max-line-length
    'a (priority )?loader "{word}" that provides {strings}(?: and requires {strings})?',
    (priority, name, provides, requires) =>
      addMiddleware(name, {
        $noOrder: !!priority,
        $provides: JSON.parse(provides),
        $requires: JSON.parse(requires || '[]'),
      }),
  );
  Given(
    'a permission "{word}" that requires (.*)',
    (name, deps) => addMiddleware(name, {
      $permission: name,
      $requires: JSON.parse(deps),
    }),
  );
  When(
    'ordering (.*)',
    (mids) => {
      const original = JSON.parse(mids) as string[];
      setCtx('$original', original);
      const map = getCtx<MidMap>('$middlewares');
      const sorted = orderMiddlewares()(
        original.map(o => map[o]),
        { method: 'post' },
      );
      setCtx('$sorted', sorted.map(m => (m as Mid).$name || ''));
    },
  );
  Then(
    'the order of the middlewares remains unchanged',
    () => deepEqual(getCtx('$sorted'), getCtx('$original')),
  );
  Then(
    'the ordered middlewares are (.*)',
    expected => deepEqual(getCtx('$sorted'), JSON.parse(expected)),
  );
  // === Advanced example =================================================== //
  Then(
    'the DB {op}',
    (op, expected) => compare(op, DB, expected),
    { inline: true },
  );
};

pickledCucumber(setup, {
  aliases: {
    strings: /\[[^\]]*\]/,
  },
  entities,
  http: httpSupertest(supertest(advancedApp) as any),
  usage: true,
});
