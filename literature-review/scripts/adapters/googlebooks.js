(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.normalizeArticle) return;
  // Google Books (googleapis.com/books/v1) — CORS-open. Works keyless but the
  // keyless quota is small (HTTP 429); pass {apiKey} for reliability. A
  // dataless/error body is surfaced as {error:"rate_limited"}. See reference/googlebooks.md.
  const BASE = "https://www.googleapis.com/books/v1/volumes";
  const PAGE = 20;
  function isbnOf(ids) { const i = (ids || []).find((x) => x.type === "ISBN_13") || (ids || []).find((x) => x.type === "ISBN_10"); return i ? i.identifier : null; }
  function mapVol(v) {
    const vi = (v && v.volumeInfo) || {};
    return LR.normalizeArticle({
      source: "googlebooks",
      title: [vi.title, vi.subtitle].filter(Boolean).join(": ") || null,
      authors: vi.authors || [],
      year: vi.publishedDate ? String(vi.publishedDate).slice(0, 4) : null,
      venue: vi.publisher || null,
      doi: null,
      url: vi.infoLink || (v.id ? "https://books.google.com/books?id=" + v.id : null),
      abstract: vi.description || null,
      type: "book",
      pdfUrl: (v.accessInfo && v.accessInfo.pdf && v.accessInfo.pdf.isAvailable && v.accessInfo.pdf.downloadLink) || null,
    });
  }
  function parse(j) {
    if (!j || (!Array.isArray(j.items) && typeof j.totalItems !== "number")) return { error: "rate_limited", note: (j && j.error && j.error.message) || "no data (HTTP 429? set apiKey)" };
    return { total: typeof j.totalItems === "number" ? j.totalItems : null, articles: (j.items || []).map(mapVol) };
  }
  function buildSearchUrl(p) {
    p = p || {};
    let u = BASE + "?q=" + encodeURIComponent(p.query || "") + "&maxResults=" + PAGE + "&startIndex=" + (((p.page || 1) - 1) * PAGE);
    if (p.apiKey) u += "&key=" + encodeURIComponent(p.apiKey);
    return u;
  }
  function buildAdvancedUrl(criteria, opts) {
    opts = opts || {};
    const PFX = { title: "intitle", author: "inauthor", publisher: "inpublisher", subject: "subject", isbn: "isbn" };
    const q = (criteria || []).map((c) => { if (!c || !c.term) return null; const p = PFX[c.field]; return p ? p + ":" + c.term : c.term; }).filter(Boolean).join(" ");
    return buildSearchUrl({ query: q, page: opts.page, apiKey: opts.apiKey });
  }
  function advText(criteria) { return (criteria || []).map((c) => c && c.term).filter(Boolean).join(" "); }
  async function search(args, ctx) {
    const r = parse(await ctx.fetchJson(buildSearchUrl(args)));
    if (r.error) return { error: r.error, source: "googlebooks", note: r.note };
    return LR.makeSearchResult({ query: args.query, source: "googlebooks", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  async function advancedSearch(args, ctx) {
    const r = parse(await ctx.fetchJson(buildAdvancedUrl(args.criteria, args)));
    if (r.error) return { error: r.error, source: "googlebooks", note: r.note };
    return LR.makeSearchResult({ query: advText(args.criteria), source: "googlebooks", page: args.page || 1, pageSize: PAGE, total: r.total, articles: r.articles });
  }
  const adapter = {
    source: "googlebooks", origin: "https://www.googleapis.com", pageSize: PAGE, corsOpen: true,
    capabilities: { search: true, advancedSearch: true },
    buildSearchUrl, buildAdvancedUrl, parse, mapVol, search, advancedSearch,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("googlebooks", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
