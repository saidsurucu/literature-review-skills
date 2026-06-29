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
  return {
    source: "pubmed", origin: ORIGIN, pageSize: 20,
    capabilities: { search: true, advancedSearch: true, readFulltext: "pmc", extractReferences: true },
    buildEsearchUrl, parseEsearch, buildEsummaryUrl, parseEsummary,
  };
});
