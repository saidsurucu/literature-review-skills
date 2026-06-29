(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.normalizeArticle) return;
  // Crossref (api.crossref.org) — free, no key, CORS-open. The canonical DOI
  // metadata registry across publishers. message.reference[] gives the article's
  // bibliography (deposited by the publisher). See reference/crossref.md.
  const BASE = "https://api.crossref.org";
  const MAILTO = "mailto=literature-review-skill@example.org";
  const ROWS = 20;

  function stripTags(s) { return s ? String(s).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() || null : null; }
  function firstYear(w) {
    const src = w.issued || w.published || w["published-print"] || w["published-online"] || {};
    const dp = src["date-parts"] && src["date-parts"][0];
    return dp && dp[0] ? dp[0] : null;
  }
  function authorName(a) {
    if (!a) return null;
    if (a.name) return a.name;
    return [a.given, a.family].filter(Boolean).join(" ") || null;
  }
  function pdfFromLinks(links) {
    const l = (links || []).find((x) => /pdf/i.test(x["content-type"] || "") || /\.pdf($|\?)/i.test(x.URL || ""));
    return l ? l.URL : null;
  }
  function mapItem(w) {
    return LR.normalizeArticle({
      source: "crossref",
      title: (w.title && stripTags(w.title[0])) || null,
      authors: (w.author || []).map(authorName).filter(Boolean),
      year: firstYear(w),
      venue: (w["container-title"] && w["container-title"][0]) || null,
      doi: w.DOI ? String(w.DOI).toLowerCase() : null,
      url: w.URL || (w.DOI ? "https://doi.org/" + w.DOI : null),
      abstract: stripTags(w.abstract),
      type: w.type || null,
      citationCount: typeof w["is-referenced-by-count"] === "number" ? w["is-referenced-by-count"] : null,
      pdfUrl: pdfFromLinks(w.link),
    });
  }
  function parseWorks(j) {
    const m = j.message || {};
    return { total: typeof m["total-results"] === "number" ? m["total-results"] : null, articles: (m.items || []).map(mapItem) };
  }

  function buildSearchUrl(p) {
    p = p || {};
    const offset = ((p.page || 1) - 1) * ROWS;
    return BASE + "/works?query=" + encodeURIComponent(p.query || "") + "&rows=" + ROWS + "&offset=" + offset + "&" + MAILTO;
  }
  const QMAP = { title: "query.title", author: "query.author", venue: "query.container-title", journal: "query.container-title", abstract: "query.bibliographic" };
  function buildAdvancedUrl(criteria, opts) {
    opts = opts || {};
    const parts = ["rows=" + ROWS, "offset=" + (((opts.page || 1) - 1) * ROWS), MAILTO];
    (criteria || []).forEach((c) => {
      if (!c || !c.term) return;
      const k = QMAP[c.field] || "query.bibliographic";
      parts.push(k + "=" + encodeURIComponent(c.term));
    });
    const filters = [];
    if (opts.firstYear) filters.push("from-pub-date:" + opts.firstYear + "-01-01");
    if (opts.lastYear) filters.push("until-pub-date:" + opts.lastYear + "-12-31");
    if (filters.length) parts.push("filter=" + encodeURIComponent(filters.join(",")));
    return BASE + "/works?" + parts.join("&");
  }
  function advQueryText(criteria) { return (criteria || []).map((c) => c && c.term).filter(Boolean).join(" "); }

  async function search(args, ctx) {
    const r = parseWorks(await ctx.fetchJson(buildSearchUrl(args)));
    return LR.makeSearchResult({ query: args.query, source: "crossref", page: args.page || 1, pageSize: ROWS, total: r.total, articles: r.articles });
  }
  async function advancedSearch(args, ctx) {
    const r = parseWorks(await ctx.fetchJson(buildAdvancedUrl(args.criteria, args)));
    return LR.makeSearchResult({ query: advQueryText(args.criteria), source: "crossref", page: args.page || 1, pageSize: ROWS, total: r.total, articles: r.articles });
  }
  function refText(r) {
    if (r.unstructured) return r.unstructured;
    return [r.author, r.year, r["article-title"] || r["journal-title"] || r["volume-title"]].filter(Boolean).join(" ") || (r.DOI ? "DOI " + r.DOI : "");
  }
  async function extractReferences(args, ctx) {
    const doi = args.doi || args.id;
    const j = await ctx.fetchJson(BASE + "/works/" + encodeURIComponent(doi) + "?" + MAILTO);
    const refs = (((j.message || {}).reference) || []).map((r) => ({ raw: refText(r), doi: r.DOI ? String(r.DOI).toLowerCase() : null, title: r["article-title"] || null, authors: null, year: r.year || null, url: null }));
    return { source: "crossref", doi: doi, references: refs };
  }
  async function readFulltext(args, ctx) {
    const doi = args.doi || args.id;
    const j = await ctx.fetchJson(BASE + "/works/" + encodeURIComponent(doi) + "?" + MAILTO);
    const pdf = pdfFromLinks((j.message || {}).link);
    if (!pdf) return { error: "no_fulltext", source: "crossref", note: "no full-text link deposited" };
    return { source: "crossref", pdfUrl: pdf };
  }

  const adapter = {
    source: "crossref", origin: BASE, pageSize: ROWS, corsOpen: true,
    capabilities: { search: true, advancedSearch: true, readFulltext: true, extractReferences: true },
    buildSearchUrl, buildAdvancedUrl, parseWorks, mapItem,
    search, advancedSearch, extractReferences, readFulltext,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("crossref", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
