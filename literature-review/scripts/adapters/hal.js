(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.normalizeArticle) return;
  // HAL (api.archives-ouvertes.fr) — France's open archive. Free, no key, CORS-open.
  // Solr API. See reference/hal.md.
  const BASE = "https://api.archives-ouvertes.fr/search/";
  const FL = "title_s,authFullName_s,producedDateY_i,doiId_s,uri_s,abstract_s,journalTitle_s,docType_s,fileMain_s";
  const PAGE = 25;
  function canon(doi) { return LR.canonicalDoi ? LR.canonicalDoi(doi) : (doi ? String(doi).toLowerCase() : null); }
  function mapDoc(d) {
    d = d || {};
    return LR.normalizeArticle({
      source: "hal",
      title: (d.title_s && d.title_s[0]) || null,
      authors: d.authFullName_s || [],
      year: d.producedDateY_i || null,
      venue: (d.journalTitle_s) || null,
      doi: canon(d.doiId_s),
      url: d.uri_s || null,
      abstract: (d.abstract_s && d.abstract_s[0]) || null,
      type: d.docType_s || null,
      pdfUrl: d.fileMain_s || null,
    });
  }
  function parse(j) { const r = j.response || {}; return { total: typeof r.numFound === "number" ? r.numFound : null, articles: (r.docs || []).map(mapDoc) }; }
  function buildSearchUrl(p) {
    p = p || {};
    return BASE + "?q=" + encodeURIComponent(p.query || "*:*") + "&rows=" + PAGE + "&start=" + (((p.page || 1) - 1) * PAGE) + "&fl=" + FL + "&wt=json";
  }
  function buildAdvancedUrl(criteria, opts) {
    opts = opts || {};
    const FMAP = { title: "title_t", author: "authFullName_t", abstract: "abstract_t", journal: "journalTitle_t", doi: "doiId_s" };
    const parts = [];
    (criteria || []).forEach((c, i) => {
      if (!c || !c.term) return;
      const f = FMAP[c.field] || "text";
      const frag = f + ':"' + c.term + '"';
      parts.push(i === 0 ? frag : (String(c.op || "AND").toUpperCase() + " " + frag));
    });
    let q = parts.join(" ") || "*:*";
    if (opts.firstYear || opts.lastYear) q += " AND producedDateY_i:[" + (opts.firstYear || "*") + " TO " + (opts.lastYear || "*") + "]";
    return BASE + "?q=" + encodeURIComponent(q) + "&rows=" + PAGE + "&start=" + (((opts.page || 1) - 1) * PAGE) + "&fl=" + FL + "&wt=json";
  }
  function advText(criteria) { return (criteria || []).map((c) => c && c.term).filter(Boolean).join(" "); }
  async function search(args, ctx) {
    const r = parse(await ctx.fetchJson(buildSearchUrl(args)));
    return LR.makeSearchResult({ query: args.query, source: "hal", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  async function advancedSearch(args, ctx) {
    const r = parse(await ctx.fetchJson(buildAdvancedUrl(args.criteria, args)));
    return LR.makeSearchResult({ query: advText(args.criteria), source: "hal", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  async function readFulltext(args, ctx) {
    const r = parse(await ctx.fetchJson(BASE + "?q=doiId_s:%22" + encodeURIComponent(args.doi || args.id) + "%22&fl=" + FL + "&wt=json"));
    const a = (r.articles || [])[0];
    if (!a || !a.pdfUrl) return { error: "no_fulltext", source: "hal", note: "no open-access file" };
    return { source: "hal", pdfUrl: a.pdfUrl };
  }
  const adapter = {
    source: "hal", origin: "https://api.archives-ouvertes.fr", pageSize: PAGE, corsOpen: true,
    capabilities: { search: true, advancedSearch: true, readFulltext: true },
    buildSearchUrl, buildAdvancedUrl, parse, mapDoc, search, advancedSearch, readFulltext,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("hal", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
