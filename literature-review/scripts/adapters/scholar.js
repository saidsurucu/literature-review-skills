(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.normalizeArticle) return;
  // Google Scholar. Unlike the publishers, Scholar emits NO citation_* meta — each
  // result is parsed directly from the SERP DOM (.gs_ri). No DOI, no full text, and
  // "Cited by" is forward-citations, not the article's bibliography. So Scholar
  // supports search + advancedSearch only; readFulltext/extractReferences are
  // unsupported (the dispatcher returns {error:"unsupported"}). Heavily bot-gated:
  // a /sorry/ CAPTCHA is surfaced as {error:"challenge"} for the user to solve.
  const ORIGIN = "https://scholar.google.com";

  function looksBlocked(html) {
    return /\/sorry\/|unusual traffic|not a robot|systems have detected|enablejs/i.test(html || "");
  }
  function parseDoc(html) { return new DOMParser().parseFromString(html || "", "text/html"); }

  function buildSearchUrl(p) {
    p = p || {};
    const parts = ["q=" + encodeURIComponent(p.query || "")];
    if (p.page && Number(p.page) > 1) parts.push("start=" + ((Number(p.page) - 1) * 10));
    if (p.firstYear) parts.push("as_ylo=" + encodeURIComponent(p.firstYear));
    if (p.lastYear) parts.push("as_yhi=" + encodeURIComponent(p.lastYear));
    return ORIGIN + "/scholar?" + parts.join("&");
  }
  // Scholar advanced operators live inside the q-string: author:"…", source:"…",
  // intitle:"…"; year range goes to as_ylo/as_yhi (handled by buildSearchUrl).
  const OPMAP = { author: "author", journal: "source", venue: "source", title: "intitle" };
  function buildAdvancedQuery(criteria) {
    const parts = [];
    (criteria || []).forEach((c) => {
      if (!c || !c.term) return;
      const op = OPMAP[c.field];
      parts.push(op ? op + ':"' + c.term + '"' : c.term);
    });
    return parts.join(" ");
  }
  function buildAdvancedUrl(criteria, opts) {
    opts = opts || {};
    return buildSearchUrl({ query: buildAdvancedQuery(criteria), page: opts.page, firstYear: opts.firstYear, lastYear: opts.lastYear });
  }

  function parseGsA(text) {
    const segs = String(text || "").split(" - ");
    const authors = (segs[0] || "").split(",").map((s) => s.trim()).filter(Boolean);
    const mid = segs.length >= 2 ? segs[1] : "";
    const ym = /\b(19|20)\d{2}\b/.exec(text || "");
    let venue = mid.replace(/,?\s*\b(19|20)\d{2}\b.*$/, "").trim();
    return { authors: authors, year: ym ? ym[0] : null, venue: venue || null };
  }
  function parseResults(html) {
    const doc = parseDoc(html);
    const out = [];
    doc.querySelectorAll(".gs_ri").forEach((el) => {
      const a = el.querySelector(".gs_rt a");
      const titleEl = a || el.querySelector(".gs_rt");
      if (!titleEl) return;
      const title = (titleEl.textContent || "").replace(/^\s*\[[A-Z]+\]\s*/i, "").trim();
      if (!title) return;
      const gsa = parseGsA((el.querySelector(".gs_a") || {}).textContent || "");
      let citationCount = null;
      el.querySelectorAll(".gs_fl a").forEach((x) => {
        const mm = /cited by\s+(\d+)/i.exec(x.textContent || "");
        if (mm) citationCount = parseInt(mm[1], 10);
      });
      out.push(LR.normalizeArticle({
        source: "scholar", title: title, authors: gsa.authors, year: gsa.year,
        venue: gsa.venue, doi: null, url: a ? a.getAttribute("href") : null,
        abstract: ((el.querySelector(".gs_rs") || {}).textContent || "").trim() || null,
        citationCount: citationCount,
      }));
    });
    return { articles: out, total: null };
  }

  async function search(args, ctx) {
    const html = await ctx.fetchText(buildSearchUrl(args));
    if (looksBlocked(html)) return { error: "challenge", source: "scholar", note: "Google Scholar CAPTCHA (/sorry) — solve it in the tab and retry" };
    const r = parseResults(html);
    return LR.makeSearchResult({ query: args.query, source: "scholar", page: args.page || 1, pageSize: 10, total: r.total, articles: r.articles });
  }
  async function advancedSearch(args, ctx) {
    const html = await ctx.fetchText(buildAdvancedUrl(args.criteria, args));
    if (looksBlocked(html)) return { error: "challenge", source: "scholar", note: "Google Scholar CAPTCHA (/sorry) — solve it in the tab and retry" };
    const r = parseResults(html);
    return LR.makeSearchResult({ query: buildAdvancedQuery(args.criteria), source: "scholar", page: args.page || 1, pageSize: 10, total: r.total, articles: r.articles });
  }

  const adapter = {
    source: "scholar", origin: ORIGIN, pageSize: 10,
    capabilities: { search: true, advancedSearch: true }, // no readFulltext / extractReferences
    buildSearchUrl, buildAdvancedQuery, buildAdvancedUrl, parseResults, search, advancedSearch,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("scholar", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
