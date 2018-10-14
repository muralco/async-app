import { Decorator, Entities, Middleware } from './types';

export const decorate = <TEntities extends Entities>(
  obj: Partial<Decorator>,
  fn: Middleware<TEntities>,
) => Object.assign(fn, obj);

const set = <T extends keyof Decorator>(key: T) =>
  <TEntities extends Entities>(
    value: Decorator[T],
    fn: Middleware<TEntities>,
  ) => decorate({ [key]: value }, fn);

export const permission = set('$permission');
export const provides = set('$provides');
export const requires = set('$requires');
