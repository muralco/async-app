// This hack is only here so that the `analyze` module correctly monkeypatches
// the require for `async-app` you can safely ignore this file since when using
// the proper `async-app` package non of this is required

// tslint:disable no-invalid-this
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function require(path: string) {
  if ((this as any).filename.endsWith('/dist/analyze.js')) {
    if (path === 'async-app') {
      return originalRequire.call(this, './index');
    }
  }
  return originalRequire.apply(this, arguments);
};
