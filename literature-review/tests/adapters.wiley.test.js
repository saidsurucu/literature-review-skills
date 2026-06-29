const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const LR = require("../scripts/lib.js");
require("../scripts/adapters/wiley.js");
const WILEY = LR.get("wiley");
const fx = (f) => fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8");

test("buildSearchUrl hits /action/doSearch with AllField", () => {
  const u = WILEY.buildSearchUrl({ query: "knowledge management" });
  assert.ok(u.startsWith("https://onlinelibrary.wiley.com/action/doSearch?"));
  assert.match(u, /AllField=knowledge%20management|AllField=knowledge\+management/);
});

test("parseArticleMeta reads Highwire citation_* into an Article", () => {
  const a = WILEY.parseArticleMeta(fx("wiley-article.html"));
  assert.equal(a.source, "wiley");
  assert.equal(a.title, "Strategic knowledge management: creating comparative advantages");
  assert.ok(a.authors.length >= 1);
  assert.equal(a.doi, "10.1002/jsc.814");
  assert.equal(a.year, "2008");
  assert.equal(a.venue, "Strategic Change");
  assert.equal(a.pdfUrl, "https://onlinelibrary.wiley.com/doi/pdf/10.1002/jsc.814");
});

test("harvestResultUrls keeps /doi/10. links and excludes /doi/book/", () => {
  const urls = WILEY.harvestResultUrls(fx("wiley-search.html"));
  assert.equal(urls.length, 3);
  urls.forEach((u) => assert.match(u, /^https:\/\/onlinelibrary\.wiley\.com\/doi\/10\./));
  assert.ok(!urls.some((u) => /\/doi\/book\//.test(u)));
});

test("parseReferences falls back to DOM .article-section__references li", () => {
  const refs = WILEY.parseReferences(fx("wiley-article.html"));
  assert.equal(refs.length, 2);
  assert.match(refs[0].raw, /Cyert RM/);
});

test("search op harvests listing then enriches via citation_* meta", async () => {
  const article = fx("wiley-article.html");
  const ctx = { async fetchText(u) { return u.indexOf("/action/doSearch") !== -1 ? fx("wiley-search.html") : article; } };
  const r = await WILEY.search({ query: "knowledge", page: 1 }, ctx);
  assert.equal(r.source, "wiley");
  assert.ok(r.articles.length >= 1);
  assert.equal(r.articles[0].doi, "10.1002/jsc.814");
});
