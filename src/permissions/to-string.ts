export default (permission: string) => permission
  .replace(/\./g, '_')
  .replace(/In$/, '')
  .replace(/To$/, '')
  .toUpperCase();
