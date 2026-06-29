(function (root, factory) {
  const api = factory();
  api.__install = function (target) {
    if (target.__LR && target.__LR._adapters) {
      // Merge prior registrations into this instance (whose closures read
      // api._adapters), then take over the global. Preserves the registry
      // across re-injection without leaving stale closures behind.
      Object.assign(api._adapters, target.__LR._adapters);
    }
    target.__LR = api;
    return target.__LR;
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  api.__install(root);
  return api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const _adapters = Object.create(null);
  function register(source, adapter) {
    adapter.source = adapter.source || source;
    _adapters[source] = adapter;
    return adapter;
  }
  function get(source) { return _adapters[source] || null; }
  return { _adapters, register, get };
});
