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

  const ARTICLE_FIELDS = ["source", "title", "authors", "year", "venue", "doi", "url", "abstract", "type", "citationCount", "pdfUrl"];
  function normalizeArticle(raw) {
    raw = raw || {};
    const a = {};
    ARTICLE_FIELDS.forEach((f) => {
      if (f === "authors") a.authors = Array.isArray(raw.authors) ? raw.authors : [];
      else a[f] = raw[f] == null ? null : raw[f];
    });
    return a;
  }
  function makeSearchResult(p) {
    p = p || {};
    const articles = (p.articles || []).map(normalizeArticle);
    let hasNext;
    if (p.total == null) hasNext = articles.length >= (p.pageSize || articles.length);
    else hasNext = (p.page || 1) * (p.pageSize || articles.length) < p.total;
    return { query: p.query, source: p.source, pagination: { page: p.page || 1, total: p.total == null ? null : p.total, hasNext: !!hasNext }, articles };
  }

  return { _adapters, register, get, normalizeArticle, makeSearchResult };
});
