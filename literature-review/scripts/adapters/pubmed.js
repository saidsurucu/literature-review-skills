(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (LR && LR.register) LR.register("pubmed", api);
  return api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
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
  return {
    source: "pubmed", origin: ORIGIN, pageSize: 20,
    capabilities: { search: true, advancedSearch: true, readFulltext: "pmc", extractReferences: true },
    buildEsearchUrl, parseEsearch,
  };
});
