(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (LR && LR.register) LR.register("pubmed", api);
  return api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function require_norm(raw) {
    const LR = (typeof globalThis !== "undefined" && globalThis.__LR) ||
               (typeof require !== "undefined" && require("../lib.js"));
    return LR ? LR.normalizeArticle(raw) : raw;
  }
  const ORIGIN = "https://eutils.ncbi.nlm.nih.gov";
  const BASE = ORIGIN + "/entrez/eutils/";
  const TOOL = "literature-review";
  const EMAIL = "literature-review-skill@example.org";
  function common(apiKey) {
    let s = "tool=" + TOOL + "&email=" + encodeURIComponent(EMAIL);
    if (apiKey) s += "&api_key=" + encodeURIComponent(apiKey);
    return s;
  }
  function buildEsearchUrl(p) {
    p = p || {};
    const pageSize = p.pageSize || 20;
    const retstart = ((p.page || 1) - 1) * pageSize;
    const parts = [
      "db=pubmed", "retmode=json",
      "retstart=" + retstart, "retmax=" + pageSize,
      "term=" + encodeURIComponent(p.term || ""),
    ];
    if (p.sort) parts.push("sort=" + encodeURIComponent(p.sort));
    return BASE + "esearch.fcgi?" + parts.join("&") + "&" + common(p.apiKey);
  }
  function parseEsearch(json) {
    const r = (json && json.esearchresult) || {};
    return { total: parseInt(r.count, 10) || 0, ids: (r.idlist || []).slice() };
  }
  function buildEsummaryUrl(p) {
    p = p || {};
    return BASE + "esummary.fcgi?db=pubmed&retmode=json&id=" +
      encodeURIComponent((p.ids || []).join(",")) + "&" + common(p.apiKey);
  }
  function parseEsummary(json) {
    const res = (json && json.result) || {};
    return (res.uids || []).map((uid) => {
      const d = res[uid] || {};
      const doiId = (d.articleids || []).find((x) => x.idtype === "doi");
      const ym = /(\d{4})/.exec(d.pubdate || "");
      return require_norm({
        source: "pubmed",
        title: d.title || null,
        authors: (d.authors || []).map((a) => a.name).filter(Boolean),
        year: ym ? ym[1] : null,
        venue: d.fulljournalname || d.source || null,
        doi: doiId ? doiId.value : null,
        url: "https://pubmed.ncbi.nlm.nih.gov/" + uid + "/",
        type: (d.pubtype && d.pubtype[0]) || null,
      });
    });
  }
  const FIELD_TAGS = {
    title: "Title", abstract: "Title/Abstract", author: "Author", journal: "Journal",
    year: "Publication Date", doi: "DOI", affiliation: "Affiliation", mesh: "MeSH Terms",
  };
  function normOp(op) {
    const s = String(op == null ? "AND" : op).trim().toUpperCase();
    return s === "OR" || s === "NOT" ? s : "AND";
  }
  function criteriaToTerm(criteria) {
    const parts = [];
    (criteria || []).forEach((c, i) => {
      if (!c || !c.term) return;
      const tag = FIELD_TAGS[c.field] || c.field;
      const frag = c.term + "[" + tag + "]";
      parts.push(i === 0 ? frag : normOp(c.op) + " " + frag);
    });
    return parts.join(" ");
  }
  function buildEfetchUrl(p) {
    p = p || {};
    return BASE + "efetch.fcgi?db=pubmed&retmode=xml&id=" + encodeURIComponent(p.id) + "&" + common(p.apiKey);
  }
  function parseReferencesXml(xml) {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const out = [];
    doc.querySelectorAll("Reference > Citation").forEach((n) => {
      const raw = (n.textContent || "").trim();
      if (raw) out.push({ raw: raw, title: null, authors: null, year: null, doi: null, url: null });
    });
    return out;
  }
  function require_lib() {
    return (typeof globalThis !== "undefined" && globalThis.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  }
  async function search(args, ctx) {
    const es = parseEsearch(await ctx.fetchJson(buildEsearchUrl({ term: args.query, page: args.page, pageSize: 20, sort: args.sort })));
    let articles = [];
    if (es.ids.length) articles = parseEsummary(await ctx.fetchJson(buildEsummaryUrl({ ids: es.ids })));
    return require_lib().makeSearchResult({ query: args.query, source: "pubmed", page: args.page || 1, pageSize: 20, total: es.total, articles });
  }
  async function advancedSearch(args, ctx) {
    const term = criteriaToTerm(args.criteria);
    const yr = (args.firstYear || args.lastYear)
      ? " AND (" + (args.firstYear || "1800") + "[PDAT] : " + (args.lastYear || "3000") + "[PDAT])" : "";
    return search({ query: term + yr, page: args.page, sort: args.sort }, ctx);
  }
  async function extractReferences(args, ctx) {
    const xml = await ctx.fetchText(buildEfetchUrl({ id: args.id }));
    return { source: "pubmed", id: args.id, references: parseReferencesXml(xml) };
  }
  async function readFulltext(args, ctx) {
    const linkUrl = BASE + "elink.fcgi?dbfrom=pubmed&db=pmc&retmode=json&id=" + encodeURIComponent(args.id) + "&" + common(args.apiKey);
    const j = await ctx.fetchJson(linkUrl);
    const sets = (((j.linksets || [])[0] || {}).linksetdbs) || [];
    const pmc = (sets.find((s) => s.dbto === "pmc") || {}).links;
    if (!pmc || !pmc.length) return { error: "no_fulltext", source: "pubmed", note: "no open-access PMC copy" };
    return { source: "pubmed", pmcid: "PMC" + pmc[0], pdfUrl: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC" + pmc[0] + "/pdf/" };
  }
  return {
    source: "pubmed", origin: ORIGIN, pageSize: 20,
    capabilities: { search: true, advancedSearch: true, readFulltext: "pmc", extractReferences: true },
    buildEsearchUrl, parseEsearch, buildEsummaryUrl, parseEsummary,
    criteriaToTerm, buildEfetchUrl, parseReferencesXml, search, advancedSearch, extractReferences, readFulltext,
  };
});
