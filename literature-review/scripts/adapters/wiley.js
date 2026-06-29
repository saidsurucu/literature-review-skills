(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.makePublisherAdapter) return;
  // Wiley Online Library (onlinelibrary.wiley.com, Atypon/Literatum). Unlike T&F,
  // Wiley emits HIGHWIRE citation_* meta (default profile). Search
  // /action/doSearch?AllField=, article/chapter links /doi/10.<doi> (whole-book
  // /doi/book/<doi> landing pages excluded). References in the DOM
  // (.article-section__references li). See reference/wiley.md.
  const adapter = LR.makePublisherAdapter({
    source: "wiley",
    origin: "https://onlinelibrary.wiley.com",
    pageSize: 10,
    searchPath: "/action/doSearch",
    queryParam: "AllField",
    linkMatch: /\/doi\/10\./,
    fields: { title: "Title", author: "ContribAuthorStored", abstract: "AbstractField", doi: "DOI", journal: "SeriesKey" },
    refSelectors: [".article-section__references li", 'section[id*="reference"] li', ".references li"],
  });
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("wiley", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
