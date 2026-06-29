(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.normalizeArticle) return;
  // DOAJ (Directory of Open Access Journals) — free, no key, CORS-open. Articles in
  // vetted fully-OA journals. See reference/doaj.md.
  const BASE = "https://doaj.org/api/search/articles";
  const PAGE = 25;
  function canon(doi) { return LR.canonicalDoi ? LR.canonicalDoi(doi) : (doi ? String(doi).toLowerCase() : null); }
  function mapArticle(x) {
    const b = (x && x.bibjson) || {};
    const ids = b.identifier || [];
    const doiId = ids.find((i) => i.type === "doi");
    const fulltext = (b.link || []).find((l) => l.type === "fulltext");
    return LR.normalizeArticle({
      source: "doaj",
      title: b.title || null,
      authors: (b.author || []).map((a) => a && a.name).filter(Boolean),
      year: b.year || null,
      venue: (b.journal && b.journal.title) || null,
      doi: canon(doiId && doiId.id),
      url: fulltext ? fulltext.url : (doiId ? "https://doi.org/" + doiId.id : null),
      abstract: b.abstract || null,
      pdfUrl: fulltext ? fulltext.url : null,
    });
  }
  function parse(j) { return { total: typeof j.total === "number" ? j.total : null, articles: (j.results || []).map(mapArticle) }; }
  function buildSearchUrl(p) {
    p = p || {};
    return BASE + "/" + encodeURIComponent(p.query || "*") + "?pageSize=" + PAGE + "&page=" + (p.page || 1);
  }
  function buildAdvancedUrl(criteria, opts) {
    opts = opts || {};
    const FMAP = { title: "bibjson.title", author: "bibjson.author.name", journal: "bibjson.journal.title", doi: "bibjson.identifier.id", abstract: "bibjson.abstract" };
    const parts = [];
    (criteria || []).forEach((c, i) => {
      if (!c || !c.term) return;
      const f = FMAP[c.field] || "bibjson.title";
      const frag = f + ':"' + c.term + '"';
      parts.push(i === 0 ? frag : (String(c.op || "AND").toUpperCase() + " " + frag));
    });
    let q = parts.join(" ");
    if (opts.firstYear || opts.lastYear) q += (q ? " AND " : "") + "bibjson.year:[" + (opts.firstYear || "*") + " TO " + (opts.lastYear || "*") + "]";
    return BASE + "/" + encodeURIComponent(q || "*") + "?pageSize=" + PAGE + "&page=" + (opts.page || 1);
  }
  function advText(criteria) { return (criteria || []).map((c) => c && c.term).filter(Boolean).join(" "); }
  async function search(args, ctx) {
    const r = parse(await ctx.fetchJson(buildSearchUrl(args)));
    return LR.makeSearchResult({ query: args.query, source: "doaj", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  async function advancedSearch(args, ctx) {
    const r = parse(await ctx.fetchJson(buildAdvancedUrl(args.criteria, args)));
    return LR.makeSearchResult({ query: advText(args.criteria), source: "doaj", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  async function readFulltext(args, ctx) {
    // DOAJ articles are OA; resolve via a single-query lookup by DOI.
    const r = parse(await ctx.fetchJson(buildSearchUrl({ query: "doi:" + (args.doi || args.id) })));
    const a = (r.articles || [])[0];
    if (!a || !a.pdfUrl) return { error: "no_fulltext", source: "doaj", note: "no fulltext link" };
    return { source: "doaj", pdfUrl: a.pdfUrl };
  }
  const adapter = {
    source: "doaj", origin: "https://doaj.org", pageSize: PAGE, corsOpen: true,
    capabilities: { search: true, advancedSearch: true, readFulltext: true },
    buildSearchUrl, buildAdvancedUrl, parse, mapArticle, search, advancedSearch, readFulltext,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("doaj", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
