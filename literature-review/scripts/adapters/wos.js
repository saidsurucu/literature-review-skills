(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.normalizeArticle) return;
  // Web of Science Core Collection (webofscience.com) — institutional login.
  // HYBRID: runQuerySearch (HTTP, ?SID=) validates the query + returns QueryID +
  // RecordsFound; record bodies come from the results-page DOM (record bodies over
  // the API are anti-bot gated → {error:"challenge"}). Navigate-first on
  // https://www.webofscience.com. See reference/wos.md.
  const ORIGIN = "https://www.webofscience.com";
  const RUN = "/api/wosnx/core/runQuerySearch";

  const FIELD_TAGS = { topic: "TS", title: "TI", author: "AU", keywords: "AK", source: "SO",
    journal: "SO", abstract: "AB", doi: "DO", year: "PY" };
  function tag(f) { return FIELD_TAGS[f] || (f && String(f).length === 2 ? String(f).toUpperCase() : "TS"); }
  function normBool(op) { const s = String(op == null ? "AND" : op).toUpperCase(); return (s === "OR" || s === "NOT") ? s : "AND"; }

  function buildRows(args) { return [{ rowField: "TS", rowText: (args && args.query) || "" }]; }
  function buildRowsFromCriteria(criteria) {
    return (criteria || []).filter((c) => c && c.term).map((c, i) =>
      i === 0 ? { rowField: tag(c.field), rowText: c.term }
              : { rowBoolean: normBool(c.op), rowField: tag(c.field), rowText: c.term });
  }
  function buildRunBody(rows, opts) {
    opts = opts || {};
    return { search: { mode: "general", database: "WOSCC", query: rows },
      retrieve: { Count: opts.count || 10, FirstRecord: opts.first || 1,
        Options: { View: "Custom", DataFormat: "Map", ReturnType: "List" } } };
  }
  function rpcEntry(rpc, key) { return (Array.isArray(rpc) ? rpc : []).find((e) => e && e.key === key); }
  function parseSearchInfo(rpc) {
    const e = rpcEntry(rpc, "searchInfo");
    const p = (e && e.payload) || {};
    return { queryId: p.QueryID || null, total: typeof p.RecordsFound === "number" ? p.RecordsFound : null };
  }
  function isChallenge(rpc) {
    const e = rpcEntry(rpc, "error");
    return !!(e && Array.isArray(e.payload) && e.payload.some((s) => /passiveVerification/i.test(String(s))));
  }

  function parseDoc(html) { return new DOMParser().parseFromString(html || "", "text/html"); }
  function txt(el, sel) { const e = el.querySelector(sel); return e ? (e.textContent || "").replace(/\s+/g, " ").trim() : null; }
  function splitAuthors(s) { return s ? s.split(/;|\band\b/).map((x) => x.trim()).filter(Boolean) : []; }
  function parseResults(html) {
    const doc = parseDoc(html);
    const out = [];
    doc.querySelectorAll("app-record").forEach((rec) => {
      const a = rec.querySelector('a[href*="/full-record/WOS:"]') || rec.querySelector('[data-ta="summary-record-title-link"]');
      if (!a) return;
      let href = a.getAttribute("href") || "";
      if (href.indexOf("http") !== 0) href = ORIGIN + href;
      out.push(LR.normalizeArticle({
        source: "wos",
        title: (a.textContent || "").replace(/\s+/g, " ").trim() || null,
        authors: splitAuthors(txt(rec, ".summary-record-authors")),
        year: txt(rec, ".summary-record-year"),
        venue: txt(rec, ".summary-source-title"),
        doi: null,
        url: href.split("#")[0].split("?")[0],
        type: null, citationCount: null, abstract: null, pdfUrl: null,
      }));
    });
    return { articles: out, total: null };
  }

  function getSid(args) {
    if (args && args.sid) return args.sid;
    try {
      if (typeof localStorage !== "undefined") {
        const raw = localStorage.getItem("wos_sid");
        return raw ? JSON.parse(raw) : null;
      }
    } catch (e) { /* fall through */ }
    return null;
  }
  async function runAndCollect(rows, args, ctx) {
    const sid = getSid(args);
    if (!sid) return { error: "auth_required", source: "wos", note: "no wos_sid — sign in to Web of Science in the tab" };
    const page = Number(args.page) || 1;
    const body = buildRunBody(rows, { count: adapter.pageSize, first: (page - 1) * adapter.pageSize + 1 });
    const rpc = await ctx.fetchJson(ORIGIN + RUN + "?SID=" + encodeURIComponent(sid), {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(body),
    });
    if (isChallenge(rpc)) return { error: "challenge", source: "wos", note: "WoS passive verification — run a search in the tab to clear it, then retry" };
    const info = parseSearchInfo(rpc);
    const html = ctx.pageHtml ? await ctx.pageHtml() : "";
    const parsed = parseResults(html);
    return LR.makeSearchResult({ query: args.query || "", source: "wos", page: page, pageSize: adapter.pageSize, total: info.total, articles: parsed.articles });
  }
  async function search(args, ctx) { return runAndCollect(buildRows(args), args, ctx); }
  async function advancedSearch(args, ctx) { return runAndCollect(buildRowsFromCriteria(args.criteria), args, ctx); }

  const adapter = {
    source: "wos", origin: ORIGIN, pageSize: 10, RUN, FIELD_TAGS,
    capabilities: { search: true, advancedSearch: true },
    buildRows, buildRowsFromCriteria, buildRunBody, parseSearchInfo, isChallenge,
    parseResults, getSid, search, advancedSearch,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("wos", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
