(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.normalizeArticle) return;
  // arXiv (export.arxiv.org/api) — free Atom-XML API. NOT CORS-open: navigate to
  // export.arxiv.org first (e.g. /api/query?search_query=all:test&max_results=1).
  // No references in the API → search/advancedSearch/readFulltext only (PDFs are
  // always open access). See reference/arxiv.md.
  const BASE = "https://export.arxiv.org/api/query";
  const PAGE = 25;

  function canon(doi) { return LR.canonicalDoi ? LR.canonicalDoi(doi) : (doi ? String(doi).toLowerCase() : null); }
  function txt(el, tag) { const n = el.getElementsByTagName(tag)[0]; return n ? (n.textContent || "").replace(/\s+/g, " ").trim() || null : null; }
  function mapEntry(e) {
    const authors = Array.prototype.map.call(e.getElementsByTagName("author"), (a) => {
      const n = a.getElementsByTagName("name")[0]; return n ? (n.textContent || "").trim() : null;
    }).filter(Boolean);
    const links = Array.prototype.slice.call(e.getElementsByTagName("link"));
    const pdf = links.find((l) => l.getAttribute("title") === "pdf");
    const id = txt(e, "id");
    const pub = txt(e, "published");
    const cat = e.getElementsByTagName("category")[0];
    const doiEl = e.getElementsByTagName("arxiv:doi")[0];
    return LR.normalizeArticle({
      source: "arxiv",
      title: txt(e, "title"),
      authors: authors,
      year: pub ? pub.slice(0, 4) : null,
      venue: "arXiv" + (cat && cat.getAttribute("term") ? " (" + cat.getAttribute("term") + ")" : ""),
      doi: doiEl ? canon(doiEl.textContent.trim()) : null,
      url: id,
      abstract: txt(e, "summary"),
      type: "preprint",
      pdfUrl: pdf ? pdf.getAttribute("href") : (id ? id.replace("/abs/", "/pdf/") : null),
    });
  }
  function parseFeed(xml) {
    const d = new DOMParser().parseFromString(xml || "", "application/xml");
    const totalEl = d.getElementsByTagName("opensearch:totalResults")[0];
    const total = totalEl ? parseInt(totalEl.textContent, 10) : null;
    const articles = Array.prototype.map.call(d.getElementsByTagName("entry"), mapEntry);
    return { total: isNaN(total) ? null : total, articles: articles };
  }

  function buildSearchUrl(p) {
    p = p || {};
    return BASE + "?search_query=" + encodeURIComponent("all:" + (p.query || "")) +
      "&start=" + (((p.page || 1) - 1) * PAGE) + "&max_results=" + PAGE;
  }
  const PREFIX = { title: "ti", author: "au", abstract: "abs", category: "cat", journal: "jr" };
  function buildQuery(criteria) {
    const parts = [];
    (criteria || []).forEach((c, i) => {
      if (!c || !c.term) return;
      const pf = PREFIX[c.field] || "all";
      const frag = pf + ':"' + c.term + '"';
      parts.push(i === 0 ? frag : (String(c.op || "AND").toUpperCase() + " " + frag));
    });
    return parts.join(" ");
  }
  function buildAdvancedUrl(criteria, opts) {
    opts = opts || {};
    let q = buildQuery(criteria);
    if (opts.firstYear || opts.lastYear) {
      const lo = (opts.firstYear || "1991") + "0101", hi = (opts.lastYear || "3000") + "1231";
      q = (q ? q + " AND " : "") + "submittedDate:[" + lo + " TO " + hi + "]";
    }
    return BASE + "?search_query=" + encodeURIComponent(q) + "&start=" + (((opts.page || 1) - 1) * PAGE) + "&max_results=" + PAGE;
  }
  function advQueryText(criteria) { return (criteria || []).map((c) => c && c.term).filter(Boolean).join(" "); }

  async function search(args, ctx) {
    const r = parseFeed(await ctx.fetchText(buildSearchUrl(args)));
    return LR.makeSearchResult({ query: args.query, source: "arxiv", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  async function advancedSearch(args, ctx) {
    const r = parseFeed(await ctx.fetchText(buildAdvancedUrl(args.criteria, args)));
    return LR.makeSearchResult({ query: advQueryText(args.criteria), source: "arxiv", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  async function readFulltext(args, ctx) {
    if (args.pdfUrl) return { source: "arxiv", pdfUrl: args.pdfUrl };
    const id = (args.id || args.url || "").replace("/abs/", "/pdf/");
    if (!id) return { error: "no_fulltext", source: "arxiv", note: "pass id/url/pdfUrl" };
    return { source: "arxiv", pdfUrl: id };
  }

  const adapter = {
    source: "arxiv", origin: "https://export.arxiv.org", pageSize: PAGE,
    capabilities: { search: true, advancedSearch: true, readFulltext: true }, // no extractReferences
    buildSearchUrl, buildAdvancedUrl, buildQuery, parseFeed, mapEntry,
    search, advancedSearch, readFulltext,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("arxiv", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
