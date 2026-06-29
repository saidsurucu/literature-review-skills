(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (LR && LR.register) LR.register("emerald", api);
  return api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const ORIGIN = "https://www.emerald.com";
  // Advanced-search field hints. Emerald (Silverchair) accepts a combined q-string;
  // exact field syntax is best-effort and verified by the live smoke test.
  const FIELDS = { title: "title", author: "author", abstract: "abstract", keywords: "keyword", doi: "doi", journal: "pub" };
  function lib() {
    return (typeof globalThis !== "undefined" && globalThis.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  }
  function parseDoc(html) { return new DOMParser().parseFromString(html, "text/html"); }
  function buildSearchUrl(p) {
    p = p || {};
    const parts = ["q=" + encodeURIComponent(p.query || "")];
    if (p.page && Number(p.page) > 1) parts.push("page=" + encodeURIComponent(p.page));
    return ORIGIN + "/search-results?" + parts.join("&");
  }
  function normOp(op) { const s = String(op == null ? "AND" : op).toUpperCase(); return (s === "OR" || s === "NOT") ? s : "AND"; }
  function buildAdvancedQuery(criteria, opts) {
    const parts = [];
    (criteria || []).forEach((c, i) => {
      if (!c || !c.term) return;
      const f = FIELDS[c.field] || c.field;
      const frag = f + ":(" + c.term + ")";
      parts.push(i === 0 ? frag : normOp(c.op) + " " + frag);
    });
    let q = parts.join(" ");
    if (opts && (opts.firstYear || opts.lastYear)) q += " " + (opts.firstYear || "") + "-" + (opts.lastYear || "");
    return q.trim();
  }
  function buildAdvancedUrl(criteria, opts) {
    const parts = ["q=" + encodeURIComponent(buildAdvancedQuery(criteria, opts))];
    if (opts && opts.page && Number(opts.page) > 1) parts.push("page=" + encodeURIComponent(opts.page));
    return ORIGIN + "/search-results?" + parts.join("&");
  }
  function meta(doc, name) {
    const els = doc.querySelectorAll('meta[name="' + name + '"]');
    return Array.prototype.map.call(els, (e) => (e.getAttribute("content") || "").trim()).filter(Boolean);
  }
  function yearFrom(date, doi) {
    const ym = /(\d{4})/.exec(date || "");
    if (ym) return ym[1];
    const dm = /(20\d{2}|19\d{2})/.exec(doi || ""); // Emerald DOIs embed the year, e.g. JKM-03-2026-0465
    return dm ? dm[1] : null;
  }
  function parseArticleMeta(html) {
    const doc = parseDoc(html);
    const doi = meta(doc, "citation_doi")[0] || null;
    const date = meta(doc, "citation_publication_date")[0] || meta(doc, "citation_date")[0] || meta(doc, "citation_online_date")[0] || "";
    return lib().normalizeArticle({
      source: "emerald",
      title: meta(doc, "citation_title")[0] || null,
      authors: meta(doc, "citation_author"),
      year: yearFrom(date, doi),
      venue: meta(doc, "citation_journal_title")[0] || null,
      doi: doi,
      url: meta(doc, "citation_abstract_html_url")[0] || meta(doc, "citation_fulltext_html_url")[0] || null,
      pdfUrl: meta(doc, "citation_pdf_url")[0] || null,
      abstract: meta(doc, "citation_abstract")[0] || null,
    });
  }
  function harvestResultUrls(html) {
    const doc = parseDoc(html);
    const seen = []; const out = [];
    doc.querySelectorAll('a[href*="/doi/"]').forEach((a) => {
      let href = a.getAttribute("href") || "";
      if (href.indexOf("http") !== 0) href = ORIGIN + href;
      href = href.split("?")[0].split("#")[0];
      if (seen.indexOf(href) === -1) { seen.push(href); out.push(href); }
    });
    return out;
  }
  function parseReferences(html) {
    const doc = parseDoc(html);
    const metas = meta(doc, "citation_reference");
    if (metas.length) return metas.map((r) => ({ raw: r, title: null, authors: null, year: null, doi: null, url: null }));
    const out = [];
    doc.querySelectorAll(".references li, ol.references li, .ref-list li, section.references li").forEach((li) => {
      const raw = (li.textContent || "").replace(/\s+/g, " ").trim();
      if (raw) out.push({ raw, title: null, authors: null, year: null, doi: null, url: null });
    });
    return out;
  }
  async function searchFromUrl(listUrl, query, page, ctx) {
    const L = lib();
    const html = await ctx.fetchText(listUrl);
    const urls = harvestResultUrls(html).slice(0, 10);
    const articles = (await L.mapPool(urls, 3, async (u) => {
      try { return parseArticleMeta(await ctx.fetchText(u)); } catch (e) { return null; }
    })).filter(Boolean);
    return L.makeSearchResult({ query, source: "emerald", page: page || 1, pageSize: 10, total: null, articles });
  }
  async function search(args, ctx) { return searchFromUrl(buildSearchUrl(args), args.query, args.page, ctx); }
  async function advancedSearch(args, ctx) {
    return searchFromUrl(buildAdvancedUrl(args.criteria, args), buildAdvancedQuery(args.criteria, args), args.page, ctx);
  }
  async function extractReferences(args, ctx) {
    const html = await ctx.fetchText(args.url);
    return { source: "emerald", url: args.url, references: parseReferences(html) };
  }
  async function readFulltext(args, ctx) {
    const a = parseArticleMeta(await ctx.fetchText(args.url));
    if (!a.pdfUrl) return { error: "no_fulltext", source: "emerald", note: "subscription/login required" };
    return { source: "emerald", pdfUrl: a.pdfUrl };
  }
  return {
    source: "emerald", origin: ORIGIN, pageSize: 10,
    capabilities: { search: true, advancedSearch: true, readFulltext: true, extractReferences: true },
    fields: FIELDS, buildSearchUrl, buildAdvancedQuery, buildAdvancedUrl,
    parseArticleMeta, harvestResultUrls, parseReferences,
    search, advancedSearch, extractReferences, readFulltext,
  };
});
