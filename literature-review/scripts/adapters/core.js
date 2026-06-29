(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.normalizeArticle) return;
  // CORE (api.core.ac.uk/v3) — 290M+ open-access papers with full text. Requires a
  // FREE API key (https://core.ac.uk/services/api) passed as {apiKey} → Bearer
  // header. Without a key the op returns {error:"auth_required"}. The CORE response
  // shape is encoded from the v3 docs; verify against a live key. See reference/core.md.
  const BASE = "https://api.core.ac.uk/v3/search/works";
  const PAGE = 25;
  function canon(doi) { return LR.canonicalDoi ? LR.canonicalDoi(doi) : (doi ? String(doi).toLowerCase() : null); }
  function mapWork(w) {
    w = w || {};
    return LR.normalizeArticle({
      source: "core",
      title: w.title || null,
      authors: (w.authors || []).map((a) => (typeof a === "string" ? a : a.name)).filter(Boolean),
      year: w.yearPublished || (w.publishedDate ? String(w.publishedDate).slice(0, 4) : null),
      venue: w.publisher || (w.journals && w.journals[0] && w.journals[0].title) || null,
      doi: canon(w.doi),
      url: w.downloadUrl || (w.doi ? "https://doi.org/" + w.doi : null),
      abstract: w.abstract || null,
      pdfUrl: w.downloadUrl || null,
    });
  }
  function parse(j) { return { total: typeof j.totalHits === "number" ? j.totalHits : null, articles: (j.results || []).map(mapWork) }; }
  function opts(args) { return args && args.apiKey ? { headers: { Authorization: "Bearer " + args.apiKey } } : undefined; }
  function buildSearchUrl(p) {
    p = p || {};
    return BASE + "?q=" + encodeURIComponent(p.query || "") + "&limit=" + PAGE + "&offset=" + (((p.page || 1) - 1) * PAGE);
  }
  async function search(args, ctx) {
    if (!args || !args.apiKey) return { error: "auth_required", source: "core", note: "CORE needs a free API key in args.apiKey (core.ac.uk/services/api)" };
    const r = parse(await ctx.fetchJson(buildSearchUrl(args), opts(args)));
    return LR.makeSearchResult({ query: args.query, source: "core", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  async function advancedSearch(args, ctx) {
    if (!args || !args.apiKey) return { error: "auth_required", source: "core", note: "CORE needs a free API key in args.apiKey" };
    const q = (args.criteria || []).map((c) => {
      if (!c || !c.term) return null;
      const f = { title: "title", author: "authors", year: "yearPublished", doi: "doi", abstract: "abstract" }[c.field];
      return f ? f + ':"' + c.term + '"' : c.term;
    }).filter(Boolean).join(" AND ");
    const r = parse(await ctx.fetchJson(buildSearchUrl({ query: q, page: args.page }), opts(args)));
    return LR.makeSearchResult({ query: q, source: "core", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  const adapter = {
    source: "core", origin: "https://api.core.ac.uk", pageSize: PAGE, corsOpen: true, needsKey: true,
    capabilities: { search: true, advancedSearch: true },
    buildSearchUrl, parse, mapWork, search, advancedSearch,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("core", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
