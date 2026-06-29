(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.normalizeArticle) return;
  // Open Library (openlibrary.org) — free, no key, CORS-open. Books (works), beyond
  // the publisher book adapters. See reference/openlibrary.md.
  const BASE = "https://openlibrary.org/search.json";
  const FIELDS = "title,author_name,first_publish_year,key,ia,edition_key,language";
  const PAGE = 25;
  function mapDoc(d) {
    d = d || {};
    const ia = (d.ia && d.ia[0]) || null;
    return LR.normalizeArticle({
      source: "openlibrary",
      title: d.title || null,
      authors: d.author_name || [],
      year: d.first_publish_year || null,
      venue: null,
      doi: null,
      url: d.key ? "https://openlibrary.org" + d.key : null,
      type: "book",
      pdfUrl: ia ? "https://archive.org/details/" + ia : null,
    });
  }
  function parse(j) { return { total: typeof j.numFound === "number" ? j.numFound : null, articles: (j.docs || []).map(mapDoc) }; }
  function buildSearchUrl(p) {
    p = p || {};
    return BASE + "?q=" + encodeURIComponent(p.query || "") + "&limit=" + PAGE + "&page=" + (p.page || 1) + "&fields=" + FIELDS;
  }
  function buildAdvancedUrl(criteria, opts) {
    opts = opts || {};
    const FMAP = { title: "title", author: "author", year: "first_publish_year", subject: "subject", publisher: "publisher" };
    const parts = [];
    (criteria || []).forEach((c) => { if (!c || !c.term) return; const f = FMAP[c.field] || "q"; parts.push(f + "=" + encodeURIComponent(c.term)); });
    if (opts.firstYear) parts.push("first_publish_year=[" + opts.firstYear + " TO " + (opts.lastYear || "*") + "]");
    parts.push("limit=" + PAGE, "page=" + (opts.page || 1), "fields=" + FIELDS);
    return BASE + "?" + parts.join("&");
  }
  function advText(criteria) { return (criteria || []).map((c) => c && c.term).filter(Boolean).join(" "); }
  async function search(args, ctx) {
    const r = parse(await ctx.fetchJson(buildSearchUrl(args)));
    return LR.makeSearchResult({ query: args.query, source: "openlibrary", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  async function advancedSearch(args, ctx) {
    const r = parse(await ctx.fetchJson(buildAdvancedUrl(args.criteria, args)));
    return LR.makeSearchResult({ query: advText(args.criteria), source: "openlibrary", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  const adapter = {
    source: "openlibrary", origin: "https://openlibrary.org", pageSize: PAGE, corsOpen: true,
    capabilities: { search: true, advancedSearch: true },
    buildSearchUrl, buildAdvancedUrl, parse, mapDoc, search, advancedSearch,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("openlibrary", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
