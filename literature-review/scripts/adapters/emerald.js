(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.makePublisherAdapter) return;
  // Emerald = Silverchair site. Search at /search-results?q=, article links carry
  // /doi/ (?searchresult=1 stripped). citation_* meta tags; no date meta, so year
  // is derived from the DOI (which embeds it, e.g. JKM-03-2026). References come
  // from citation_reference metas. See reference/emerald.md.
  const adapter = LR.makePublisherAdapter({
    source: "emerald",
    origin: "https://www.emerald.com",
    pageSize: 10,
    searchPath: "/search-results",
    queryParam: "q",
    pageParam: "page",
    linkMatch: /\/doi\//,
    fields: { title: "title", author: "author", abstract: "abstract", keywords: "keyword", doi: "doi", journal: "pub" },
    refSelectors: [".references li", "ol.references li", ".ref-list li", "section.references li"],
  });
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("emerald", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
