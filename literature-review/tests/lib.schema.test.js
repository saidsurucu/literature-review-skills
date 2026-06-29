const { test } = require("node:test");
const assert = require("node:assert");
const LR = require("../scripts/lib.js");

test("normalizeArticle fills defaults and passes known fields", () => {
  const a = LR.normalizeArticle({ source: "pubmed", title: "T", doi: "10.1/x", authors: ["A"] });
  assert.equal(a.title, "T");
  assert.deepEqual(a.authors, ["A"]);
  assert.equal(a.venue, null);
  assert.equal(a.abstract, null);
});

test("makeSearchResult computes hasNext from total + pageSize", () => {
  const r = LR.makeSearchResult({ query: "q", source: "pubmed", page: 1, pageSize: 20, total: 50, articles: [] });
  assert.equal(r.pagination.total, 50);
  assert.equal(r.pagination.hasNext, true);
  const last = LR.makeSearchResult({ query: "q", source: "pubmed", page: 3, pageSize: 20, total: 50, articles: [] });
  assert.equal(last.pagination.hasNext, false);
});

test("makeSearchResult handles unknown total via last-page-full", () => {
  const full = LR.makeSearchResult({ query: "q", source: "x", page: 1, pageSize: 2, total: null, articles: [{}, {}] });
  assert.equal(full.pagination.hasNext, true);
  const partial = LR.makeSearchResult({ query: "q", source: "x", page: 1, pageSize: 2, total: null, articles: [{}] });
  assert.equal(partial.pagination.hasNext, false);
});
