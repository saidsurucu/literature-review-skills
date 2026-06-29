(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.makePublisherAdapter) return;
  // Brill (brill.com). Search at /search?q1=, article links are
  // /view/journals/.../article-*.xml (overview/issue/serial/db links excluded).
  // citation_* meta incl. citation_publication_date (year) and citation_reference
  // metas for the bibliography. See reference/brill.md.
  const adapter = LR.makePublisherAdapter({
    source: "brill",
    origin: "https://brill.com",
    pageSize: 10,
    searchPath: "/search",
    queryParam: "q1",
    linkMatch: /\/view\/.*article-.*\.xml/,
    fields: { title: "title", author: "author", abstract: "abstract", doi: "doi", journal: "pub" },
    refSelectors: ['div[class*="ref"] li', ".references li", ".ref-list li"],
  });
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("brill", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
