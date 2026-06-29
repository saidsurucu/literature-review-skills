const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const LR = require("../scripts/lib.js");
require("../scripts/adapters/brill.js");
const BRILL = LR.get("brill");
const fx = (f) => fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8");

test("buildSearchUrl hits /search with the q1 param", () => {
  const u = BRILL.buildSearchUrl({ query: "knowledge", page: 1 });
  assert.ok(u.startsWith("https://brill.com/search?"));
  assert.match(u, /q1=knowledge/);
});

test("parseArticleMeta maps citation_* tags (year from date meta)", () => {
  const a = BRILL.parseArticleMeta(fx("brill-article.html"));
  assert.equal(a.source, "brill");
  assert.equal(a.title, "Philosophical Knowledge in Poland");
  assert.ok(a.authors.length >= 1);
  assert.equal(a.doi, "10.1163/23751606-01202004");
  assert.equal(a.year, "2016");
  assert.equal(a.venue, "Transcultural Studies");
  assert.ok(a.pdfUrl && a.pdfUrl.indexOf(".pdf") !== -1);
});

test("harvestResultUrls keeps only article-*.xml links (excludes overview/issue/serial/db)", () => {
  const urls = BRILL.harvestResultUrls(fx("brill-search.html"));
  assert.ok(urls.length >= 2);
  urls.forEach((u) => assert.match(u, /^https:\/\/brill\.com\/view\/.*article-.*\.xml$/));
  assert.ok(!urls.some((u) => /overview|issue|\/serial\/|\/db\//.test(u)));
});

test("parseReferences returns a list from citation_reference metas", () => {
  const refs = BRILL.parseReferences(fx("brill-article.html"));
  assert.ok(refs.length >= 1);
  assert.match(refs[0].raw, /Twardowski/);
});

test("search op harvests listing then enriches each article", async () => {
  const article = fx("brill-article.html");
  const ctx = { async fetchText(u) { return u.indexOf("/search") !== -1 && u.indexOf("/view/") === -1 ? fx("brill-search.html") : article; } };
  const r = await BRILL.search({ query: "knowledge", page: 1 }, ctx);
  assert.equal(r.source, "brill");
  assert.ok(r.articles.length >= 1);
  assert.equal(r.articles[0].doi, "10.1163/23751606-01202004");
});
