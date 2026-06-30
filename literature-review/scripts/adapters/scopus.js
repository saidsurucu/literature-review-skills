(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.normalizeArticle) return;
  // Scopus (scopus.com) — institutional login; Next.js SPA. Records come from the
  // internal gateway API POST /gateway/documents/search (flat JSON, session cookies).
  // Standard Scopus query syntax. Navigate-first on https://www.scopus.com. See reference/scopus.md.
  const ORIGIN = "https://www.scopus.com";
  const SEARCH = "/gateway/documents/search";
  const PAGE = 25;

  function buildQuery(text) { return "TITLE-ABS-KEY(" + (text || "") + ")"; }

  const FIELD_OP = { title: "TITLE", author: "AUTH", abstract: "ABS", keywords: "KEY",
    source: "SRCTITLE", journal: "SRCTITLE", doi: "DOI", affiliation: "AFFIL", year: "PUBYEAR IS" };
  function normOp(op) { const s = String(op == null ? "AND" : op).toUpperCase(); return (s === "OR" || s === "NOT") ? s : "AND"; }
  function buildAdvancedQuery(criteria, opts) {
    const parts = [];
    (criteria || []).forEach((c, i) => {
      if (!c || !c.term) return;
      const op = (FIELD_OP[c.field] || "TITLE-ABS-KEY");
      const frag = op + "(" + c.term + ")";
      parts.push(i === 0 ? frag : normOp(c.op) + " " + frag);
    });
    let q = parts.join(" ");
    if (opts && opts.firstYear) q += (q ? " AND " : "") + "PUBYEAR > " + (Number(opts.firstYear) - 1);
    if (opts && opts.lastYear) q += (q ? " AND " : "") + "PUBYEAR < " + (Number(opts.lastYear) + 1);
    return q.trim();
  }

  function buildBody(p) {
    p = p || {};
    return {
      query: p.query || "", documentType: "s",
      searchSettings: { sort: p.sort || "plf-f", offset: ((Number(p.page) || 1) - 1) * PAGE, limit: PAGE },
      serviceValues: { origin: "searchbasic", sdt: "b", sot: "b" },
      cluster: [], facets: {}, facetFilters: [], filters: {},
      facetOperation: null, citedBy: { citeCnt: null, cite: null, citedAuthorId: null, citeDocType: null },
      refinement: null, clusterRowData: "",
    };
  }

  function canon(doi) { return LR.canonicalDoi ? LR.canonicalDoi(doi) : doi; }
  function authorName(a) { return typeof a === "string" ? a : (a && (a.indexedName || a.name || a.authorName)) || null; }
  function mapItem(it) {
    it = it || {};
    const src = it.source || {};
    return LR.normalizeArticle({
      source: "scopus",
      title: it.title || (it.titles && it.titles[0]) || null,
      authors: (it.authors || []).map(authorName).filter(Boolean),
      year: it.pubYear || null,
      venue: src.title || null,
      doi: canon(it.doi),
      url: it.eid ? ORIGIN + "/record/display.uri?eid=" + encodeURIComponent(it.eid) + "&origin=resultslist" : null,
      abstract: (it.abstractText && it.abstractText[0]) || null,
      type: it.documentType || null,
      citationCount: it.citations && typeof it.citations.count === "number" ? it.citations.count : null,
      pdfUrl: null,
    });
  }
  function parseSearch(j) {
    j = j || {};
    return { total: (j.metadata && j.metadata.totalCount) != null ? j.metadata.totalCount : null,
             articles: (j.items || []).map(mapItem) };
  }
  function postSearch(query, page, ctx) {
    return ctx.fetchJson(ORIGIN + SEARCH, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(buildBody({ query: query, page: page })),
    });
  }
  async function search(args, ctx) {
    const r = parseSearch(await postSearch(buildQuery(args.query), args.page, ctx));
    return LR.makeSearchResult({ query: args.query, source: "scopus", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  async function advancedSearch(args, ctx) {
    const q = buildAdvancedQuery(args.criteria, args);
    const r = parseSearch(await postSearch(q, args.page, ctx));
    return LR.makeSearchResult({ query: q, source: "scopus", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  async function readFulltext(args, ctx) {
    args = args || {};
    if (args.eid) return { source: "scopus", pdfUrl: ORIGIN + "/record/display.uri?eid=" + encodeURIComponent(args.eid) + "&origin=resultslist" };
    if (args.doi) return { source: "scopus", pdfUrl: "https://doi.org/" + canon(args.doi) };
    return { error: "no_fulltext", source: "scopus", note: "need eid or doi; Scopus hosts no PDF — resolve at publisher" };
  }

  const adapter = {
    source: "scopus", origin: ORIGIN, pageSize: PAGE,
    capabilities: { search: true, advancedSearch: true, readFulltext: true },
    buildQuery, buildAdvancedQuery, buildBody, SEARCH,
    mapItem, parseSearch, search, advancedSearch, readFulltext,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("scopus", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
