(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.makePublisherAdapter) return;
  // Taylor & Francis (tandfonline.com, Atypon/Literatum). Covers Routledge too
  // (journals carry dc.Publisher "Routledge"). Search /action/doSearch?AllField=,
  // article links /doi/full/<doi>. Atypon uses DUBLIN CORE meta (dc.Title, dc.Creator,
  // dc.Date, dc.Identifier[scheme=doi]) — not Highwire. References live in the DOM
  // (.references li); pdf/url derived from the DOI. See reference/tandf.md.
  const adapter = LR.makePublisherAdapter({
    source: "tandf",
    origin: "https://www.tandfonline.com",
    pageSize: 10,
    searchPath: "/action/doSearch",
    queryParam: "AllField",
    linkMatch: /\/doi\/full\//,
    metaProfile: "dublincore",
    pdfTemplate: "https://www.tandfonline.com/doi/pdf/{doi}",
    articleUrlTemplate: "https://www.tandfonline.com/doi/full/{doi}",
    fields: { title: "Title", author: "Contrib", abstract: "AbstractField", doi: "DOI", journal: "SeriesKey" },
    refSelectors: [".references li", "ul.references li", "ol.references li", ".ref-list li"],
  });
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("tandf", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
