import { PermissionFn } from './types';

const EXTRACT_KEYS_REGEX = /^\({([a-zA-Z,]+)}\)=>/;
const notEmpty = (key: string) => key && key !== '';

export default <TEntities>(
  fn: PermissionFn<TEntities>,
): (keyof TEntities)[] => {
  if (typeof fn !== 'function') throw new Error(`Invalid fn param: ${fn}`);
  if (fn.length === 0) return [];
  if (fn.length !== 1) {
    throw new Error(`"fn" must have 1 object argument: ${fn}`);
  }

  const fnStr = fn.toString().replace(/\s/g, '');

  const keys = EXTRACT_KEYS_REGEX.exec(fnStr);

  if (!keys || keys.length !== 2) {
    throw new Error(`Invalid parameters on function ${fnStr}`);
  }

  return keys[1].split(',').filter(notEmpty) as (keyof TEntities)[];
};
