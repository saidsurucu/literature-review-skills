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

  function canonicalDoi(s) {
    if (!s) return null;
    let d = String(s).trim().toLowerCase();
    d = d.replace(/^https?:\/\/(dx\.)?doi\.org\//, "").replace(/^doi:/, "");
    return d || null;
  }
  function normalizeTitle(s) {
    if (!s) return "";
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
  }
  function dedupeArticles(articles) {
    const byKey = new Map();
    const order = [];
    (articles || []).forEach((art) => {
      const key = canonicalDoi(art.doi) || "t:" + normalizeTitle(art.title);
      if (!byKey.has(key)) {
        const copy = Object.assign({}, art, { sources: [art.source].filter(Boolean) });
        byKey.set(key, copy); order.push(key);
      } else {
        const cur = byKey.get(key);
        Object.keys(art).forEach((f) => { if (cur[f] == null && art[f] != null) cur[f] = art[f]; });
        if (art.source && cur.sources.indexOf(art.source) === -1) cur.sources.push(art.source);
      }
    });
    return order.map((k) => byKey.get(k));
  }

  function makeBrowserCtx() {
    return {
      async fetchText(url, opts) { const r = await fetch(url, opts); return r.text(); },
      async fetchJson(url, opts) { const r = await fetch(url, opts); return r.json(); },
    };
  }
  const pipelines = {
    async search(a, args, ctx) {
      const html = await ctx.fetchText(a.buildSearchUrl(args));
      const res = a.parseResults(html, args);
      return makeSearchResult({ query: args.query, source: a.source, page: args.page || 1, pageSize: a.pageSize, total: res.total, articles: res.articles });
    },
    async advancedSearch(a, args, ctx) {
      const html = await ctx.fetchText(a.buildAdvancedUrl(args.criteria, args));
      const res = a.parseResults(html, args);
      return makeSearchResult({ query: a.buildAdvancedQuery(args.criteria, args), source: a.source, page: args.page || 1, pageSize: a.pageSize, total: res.total, articles: res.articles });
    },
    async extractReferences(a, args, ctx) {
      const html = await ctx.fetchText(args.url);
      return { source: a.source, url: args.url, references: a.parseReferences(html) };
    },
    async readFulltext(a, args, ctx) {
      const pdfUrl = await a.locateFulltext(args, ctx);
      if (!pdfUrl) return { error: "no_fulltext", source: a.source, note: "subscription/login required" };
      return { source: a.source, pdfUrl };
    },
  };
  async function run(source, op, args, ctx) {
    const a = get(source);
    if (!a) return { error: "unknown_source", source };
    if (!a.capabilities || !a.capabilities[op]) return { error: "unsupported", source, op };
    ctx = ctx || makeBrowserCtx();
    if (typeof a[op] === "function") return a[op](args || {}, ctx);
    if (pipelines[op]) return pipelines[op](a, args || {}, ctx);
    return { error: "unsupported", source, op };
  }

  return { _adapters, register, get, normalizeArticle, makeSearchResult, canonicalDoi, normalizeTitle, dedupeArticles, makeBrowserCtx, pipelines, run };
});
