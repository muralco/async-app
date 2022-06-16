import { deepEqual } from 'assert';
import pickledCucumber, { SetupFn } from 'pickled-cucumber';
import httpSupertest from 'pickled-cucumber/http/supertest';
import supertest from 'supertest';
import newOrderConverter from './converters/order';
import legacyOrderConverter from './converters/order/legacy';
import advancedApp from './examples/advanced/app';
import { DB } from './examples/advanced/db';
import { entities } from './examples/advanced/test';
import { ArgumentOption, Decorator } from './types';

type Mid = ArgumentOption<any, any> & { $name?: string };
interface MidMap {
  [name: string]: Mid;
}

const getName = (m: Mid): string => m.$name || m;

const setup: SetupFn = ({ compare, getCtx, Given, setCtx, Then, When }) => {
  // === Order ============================================================== //
  const addMisc = (name: string, value?: object) => {
    const ms = getCtx<MidMap>('$middlewares') || {};
    ms[name] = value ? Object.assign(value, { $name: name }) : name;
    setCtx('$middlewares', ms);
  };
  const addMiddleware = (name: string, attrs: Decorator = {}) => {
    const ms = getCtx<MidMap>('$middlewares') || {};
    const middleware = (() => {}) as Mid;
    middleware.$name = name;
    Object.assign(middleware, attrs);
    ms[name] = middleware;
    setCtx('$middlewares', ms);
  };

  Given(
    'a endpoint description "{word}"',
    name => addMisc(name),
  );
  Given(
    'an endpoint schema object "{word}"',
    name => addMisc(name, { schema: 'string' }),
  );
  Given(
    'a common middleware "{word}"',
    name => addMiddleware(name),
  );
  Given(
    'a loader "{word}" that provides {strings}(?: and requires {strings})?',
    (name, provides, requires) => addMiddleware(name, {
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
    // This RegEx is hard to follow: TLDR: matches a JSON parsable string
    `(new|legacy) ordering ([\\{\\[][^\\{\\[]+[\\}\\]])`,
    (newConverter, mids, options) => {
      const original = JSON.parse(mids) as string[];
      setCtx('$original', original);
      const parsedOptions = options ? JSON.parse(options) : {};
      const map = getCtx<MidMap>('$middlewares');
      const orderConverter = newConverter === 'new'
        ? newOrderConverter(parsedOptions)
        : legacyOrderConverter();
      const sorted = orderConverter(
        original.map(o => map[o]),
        { method: 'post' },
      );
      setCtx('$sorted', sorted.map(m => getName(m as Mid) || ''));
    },
    { optional: 'with' },
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
