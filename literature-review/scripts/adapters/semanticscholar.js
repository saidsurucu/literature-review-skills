(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.normalizeArticle) return;
  // Semantic Scholar (api.semanticscholar.org) — free JSON API. NOT CORS-open:
  // navigate to the api.semanticscholar.org origin first (same-origin fetch). The
  // keyless pool is heavily rate-limited (HTTP 429) — pass {apiKey} for reliability.
  // A rate-limited / error body (no `data`) is surfaced as {error:"rate_limited"}.
  // Strengths: citation graph + references + TLDR. See reference/semanticscholar.md.
  const BASE = "https://api.semanticscholar.org/graph/v1";
  const FIELDS = "title,year,venue,externalIds,authors,abstract,citationCount,openAccessPdf,tldr";
  const PAGE = 25;

  function canon(doi) { return LR.canonicalDoi ? LR.canonicalDoi(doi) : (doi ? String(doi).toLowerCase() : null); }
  function mapPaper(x) {
    x = x || {};
    const oa = x.openAccessPdf || {};
    return LR.normalizeArticle({
      source: "semanticscholar",
      title: x.title || null,
      authors: (x.authors || []).map((a) => a && a.name).filter(Boolean),
      year: x.year || null,
      venue: x.venue || null,
      doi: canon(x.externalIds && x.externalIds.DOI),
      url: x.paperId ? "https://www.semanticscholar.org/paper/" + x.paperId : (oa.url || null),
      abstract: (x.tldr && x.tldr.text) || x.abstract || null,
      citationCount: typeof x.citationCount === "number" ? x.citationCount : null,
      pdfUrl: oa.url || null,
    });
  }
  function parseSearch(j) {
    if (!j || !Array.isArray(j.data)) return { error: "rate_limited", note: (j && (j.message || j.error)) || "no data (likely HTTP 429 — set an API key)" };
    return { total: typeof j.total === "number" ? j.total : null, articles: j.data.map(mapPaper) };
  }
  function opts(args) { return (args && args.apiKey) ? { headers: { "x-api-key": args.apiKey } } : undefined; }

  function buildSearchUrl(p) {
    p = p || {};
    const parts = ["query=" + encodeURIComponent(p.query || ""), "limit=" + PAGE, "offset=" + (((p.page || 1) - 1) * PAGE), "fields=" + FIELDS];
    if (p.firstYear || p.lastYear) parts.push("year=" + (p.firstYear || "") + "-" + (p.lastYear || ""));
    return BASE + "/paper/search?" + parts.join("&");
  }
  function advQueryText(criteria) { return (criteria || []).map((c) => c && c.term).filter(Boolean).join(" "); }
  function buildAdvancedUrl(criteria, o) {
    o = o || {};
    return buildSearchUrl({ query: advQueryText(criteria), page: o.page, firstYear: o.firstYear, lastYear: o.lastYear });
  }

  async function search(args, ctx) {
    const r = parseSearch(await ctx.fetchJson(buildSearchUrl(args), opts(args)));
    if (r.error) return { error: r.error, source: "semanticscholar", note: r.note };
    return LR.makeSearchResult({ query: args.query, source: "semanticscholar", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  async function advancedSearch(args, ctx) {
    const r = parseSearch(await ctx.fetchJson(buildAdvancedUrl(args.criteria, args), opts(args)));
    if (r.error) return { error: r.error, source: "semanticscholar", note: r.note };
    return LR.makeSearchResult({ query: advQueryText(args.criteria), source: "semanticscholar", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  function paperId(args) {
    const id = args.id || args.paperId || (args.doi ? "DOI:" + args.doi : "");
    return encodeURIComponent(id);
  }
  async function extractReferences(args, ctx) {
    const j = await ctx.fetchJson(BASE + "/paper/" + paperId(args) + "/references?fields=title,year,externalIds,authors&limit=100", opts(args));
    if (!j || !Array.isArray(j.data)) return { error: "rate_limited", source: "semanticscholar", note: (j && j.message) || "no data (HTTP 429?)" };
    const refs = j.data.map((d) => {
      const c = (d && d.citedPaper) || {};
      return { raw: [(c.authors || []).map((a) => a.name).join(", "), c.year, c.title].filter(Boolean).join(" ") || "", title: c.title || null, doi: canon(c.externalIds && c.externalIds.DOI), year: c.year || null, authors: null, url: null };
    });
    return { source: "semanticscholar", references: refs };
  }
  async function readFulltext(args, ctx) {
    const j = await ctx.fetchJson(BASE + "/paper/" + paperId(args) + "?fields=openAccessPdf", opts(args));
    const url = j && j.openAccessPdf && j.openAccessPdf.url;
    if (!url) return { error: "no_fulltext", source: "semanticscholar", note: "no open-access PDF" };
    return { source: "semanticscholar", pdfUrl: url };
  }

  const adapter = {
    source: "semanticscholar", origin: "https://api.semanticscholar.org", pageSize: PAGE,
    capabilities: { search: true, advancedSearch: true, readFulltext: true, extractReferences: true },
    buildSearchUrl, buildAdvancedUrl, parseSearch, mapPaper,
    search, advancedSearch, extractReferences, readFulltext,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("semanticscholar", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
