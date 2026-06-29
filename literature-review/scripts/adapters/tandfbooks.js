(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.makePublisherAdapter) return;
  // Taylor & Francis / Routledge BOOKS (taylorfrancis.com). Distinct from the
  // tandfonline.com journals adapter: the search page is CLIENT-RENDERED (the
  // fetched HTML has no result anchors), so search harvests from the LIVE DOM
  // (liveSearchDom). Book DETAIL pages, however, are fetch+parse-able and emit
  // Highwire citation_* meta (incl. citation_pdf_url). Whole books expose no flat
  // bibliography, so only search + readFulltext are supported. See reference/tandfbooks.md.
  const adapter = LR.makePublisherAdapter({
    source: "tandfbooks",
    origin: "https://www.taylorfrancis.com",
    pageSize: 10,
    searchPath: "/search",
    queryParam: "key",
    liveSearchDom: true,
    linkMatch: /\/books\/(mono|edit)\//,
    capabilities: { search: true, readFulltext: true },
    refSelectors: [],
  });
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("tandfbooks", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
