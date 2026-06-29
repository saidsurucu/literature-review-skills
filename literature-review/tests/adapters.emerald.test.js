const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const LR = require("../scripts/lib.js");
require("../scripts/adapters/emerald.js");
const EMERALD = LR.get("emerald");
const fx = (f) => fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8");

test("buildSearchUrl hits /search-results and encodes the query", () => {
  const u = EMERALD.buildSearchUrl({ query: "knowledge management", page: 2 });
  assert.ok(u.startsWith("https://www.emerald.com/search-results?"));
  assert.match(u, /q=knowledge%20management|q=knowledge\+management/);
  assert.match(u, /page=2/);
});

test("buildAdvancedQuery joins field criteria", () => {
  const q = EMERALD.buildAdvancedQuery([
    { field: "author", term: "Nonaka" },
    { field: "title", term: "knowledge", op: "AND" },
  ], {});
  assert.match(q, /Nonaka/);
  assert.match(q, /knowledge/);
});

test("parseArticleMeta maps citation_* tags to an Article (year from DOI)", () => {
  const a = EMERALD.parseArticleMeta(fx("emerald-article.html"));
  assert.equal(a.source, "emerald");
  assert.ok(a.title && a.title.length > 0);
  assert.ok(Array.isArray(a.authors) && a.authors.length >= 1);
  assert.equal(a.doi, "10.1108/JKM-03-2026-0465");
  assert.equal(a.year, "2026");
  assert.equal(a.venue, "Journal of Knowledge Management");
  assert.ok(a.pdfUrl && a.pdfUrl.indexOf(".pdf") !== -1);
});

test("harvestResultUrls returns absolute article links without the searchresult query", () => {
  const urls = EMERALD.harvestResultUrls(fx("emerald-search.html"));
  assert.ok(urls.length >= 2);
  urls.forEach((u) => assert.match(u, /^https:\/\/www\.emerald\.com\/.+\/doi\//));
  urls.forEach((u) => assert.ok(u.indexOf("?searchresult") === -1));
});

test("parseReferences returns a non-empty list from citation_reference metas", () => {
  const refs = EMERALD.parseReferences(fx("emerald-article.html"));
  assert.ok(refs.length >= 1);
  assert.ok(refs[0].raw && refs[0].raw.length > 0);
});

test("search op harvests listing then enriches each article", async () => {
  const article = fx("emerald-article.html");
  const ctx = {
    async fetchText(u) { return u.indexOf("/search-results") !== -1 ? fx("emerald-search.html") : article; },
  };
  const r = await EMERALD.search({ query: "knowledge", page: 1 }, ctx);
  assert.equal(r.source, "emerald");
  assert.ok(r.articles.length >= 1);
  assert.ok(r.articles[0].title);
  assert.equal(r.articles[0].doi, "10.1108/JKM-03-2026-0465");
});
