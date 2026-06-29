(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.normalizeArticle) return;
  // OpenAlex (api.openalex.org) — free, no key, CORS-open (fetch from any origin).
  // JSON works API. Rich: title, authors, venue, DOI, cited_by_count, OA PDF, and
  // referenced_works (resolved to titles for extractReferences). See reference/openalex.md.
  const BASE = "https://api.openalex.org";
  const MAILTO = "mailto=literature-review-skill@example.org";
  const PAGE = 25;

  function stripTags(s) { return s ? String(s).replace(/<[^>]+>/g, "").trim() || null : null; }
  function canon(doi) { return LR.canonicalDoi ? LR.canonicalDoi(doi) : doi; }
  function invAbstract(idx) {
    if (!idx) return null;
    const words = [];
    Object.keys(idx).forEach((w) => idx[w].forEach((pos) => { words[pos] = w; }));
    const t = words.join(" ").replace(/\s+/g, " ").trim();
    return t || null;
  }
  function shortId(id) { return id ? String(id).replace(/^https?:\/\/openalex\.org\//i, "") : ""; }
  function idForm(id) {
    if (!id) return "";
    if (/^https?:\/\/openalex\.org\//i.test(id) || /^W\d+$/i.test(id)) return shortId(id);
    if (/^10\./.test(id)) return "https://doi.org/" + id;
    return id;
  }
  function mapWork(w) {
    const loc = w.primary_location || {};
    const best = w.best_oa_location || {};
    return LR.normalizeArticle({
      source: "openalex",
      title: stripTags(w.display_name),
      authors: (w.authorships || []).map((a) => a.author && a.author.display_name).filter(Boolean),
      year: w.publication_year || null,
      venue: (loc.source && loc.source.display_name) || null,
      doi: canon(w.doi),
      url: w.doi || w.id || null,
      abstract: invAbstract(w.abstract_inverted_index),
      type: w.type || null,
      citationCount: typeof w.cited_by_count === "number" ? w.cited_by_count : null,
      pdfUrl: best.pdf_url || null,
    });
  }
  function parseWorks(j) { return { total: (j.meta && j.meta.count) || null, articles: (j.results || []).map(mapWork) }; }

  function buildSearchUrl(p) {
    p = p || {};
    return BASE + "/works?search=" + encodeURIComponent(p.query || "") + "&per-page=" + PAGE + "&page=" + (p.page || 1) + "&" + MAILTO;
  }
  function buildAdvancedUrl(criteria, opts) {
    opts = opts || {};
    const filters = []; let search = "";
    (criteria || []).forEach((c) => {
      if (!c || !c.term) return;
      if (c.field === "title") filters.push("title.search:" + c.term);
      else if (c.field === "author") filters.push("raw_author_name.search:" + c.term);
      else if (c.field === "year") filters.push("publication_year:" + c.term);
      else if (c.field === "venue" || c.field === "journal") filters.push("primary_location.source.display_name.search:" + c.term);
      else search += (search ? " " : "") + c.term;
    });
    if (opts.firstYear) filters.push("from_publication_date:" + opts.firstYear + "-01-01");
    if (opts.lastYear) filters.push("to_publication_date:" + opts.lastYear + "-12-31");
    const parts = ["per-page=" + PAGE, "page=" + (opts.page || 1), MAILTO];
    if (search) parts.unshift("search=" + encodeURIComponent(search));
    if (filters.length) parts.unshift("filter=" + encodeURIComponent(filters.join(",")));
    return BASE + "/works?" + parts.join("&");
  }
  function advQueryText(criteria) { return (criteria || []).map((c) => c && c.term).filter(Boolean).join(" "); }

  async function search(args, ctx) {
    const r = parseWorks(await ctx.fetchJson(buildSearchUrl(args)));
    return LR.makeSearchResult({ query: args.query, source: "openalex", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  async function advancedSearch(args, ctx) {
    const r = parseWorks(await ctx.fetchJson(buildAdvancedUrl(args.criteria, args)));
    return LR.makeSearchResult({ query: advQueryText(args.criteria), source: "openalex", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  async function readFulltext(args, ctx) {
    const j = await ctx.fetchJson(BASE + "/works/" + encodeURIComponent(idForm(args.id || args.doi)) + "?" + MAILTO);
    const best = j.best_oa_location || {};
    if (!best.pdf_url) return { error: "no_fulltext", source: "openalex", note: "no open-access PDF" };
    return { source: "openalex", pdfUrl: best.pdf_url };
  }
  async function extractReferences(args, ctx) {
    const j = await ctx.fetchJson(BASE + "/works/" + encodeURIComponent(idForm(args.id || args.doi)) + "?" + MAILTO);
    const ids = (j.referenced_works || []).slice(0, 50).map(shortId);
    if (!ids.length) return { source: "openalex", references: [] };
    const jj = await ctx.fetchJson(BASE + "/works?filter=openalex_id:" + ids.join("|") + "&per-page=50&select=id,display_name,doi,publication_year&" + MAILTO);
    const refs = (jj.results || []).map((w) => ({ raw: stripTags(w.display_name), title: stripTags(w.display_name), doi: canon(w.doi), year: w.publication_year || null, authors: null, url: w.doi || null }));
    return { source: "openalex", references: refs };
  }

  const adapter = {
    source: "openalex", origin: BASE, pageSize: PAGE, corsOpen: true,
    capabilities: { search: true, advancedSearch: true, readFulltext: true, extractReferences: true },
    buildSearchUrl, buildAdvancedUrl, parseWorks, mapWork, invAbstract,
    search, advancedSearch, readFulltext, extractReferences,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("openalex", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
