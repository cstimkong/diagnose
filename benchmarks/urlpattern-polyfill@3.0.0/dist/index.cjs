var import_index_impl = require("./index.impl.cjs");
if (!globalThis.URLPattern) {
  globalThis.URLPattern = import_index_impl.URLPattern;
}
