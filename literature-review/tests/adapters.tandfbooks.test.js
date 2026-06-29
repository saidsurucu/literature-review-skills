const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const LR = require("../scripts/lib.js");
require("../scripts/adapters/tandfbooks.js");
const TFB = LR.get("tandfbooks");
const fx = (f) => fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8");

test("buildSearchUrl hits /search with the key param", () => {
  const u = TFB.buildSearchUrl({ query: "knowledge management" });
  assert.ok(u.startsWith("https://www.taylorfrancis.com/search?"));
  assert.match(u, /key=knowledge%20management|key=knowledge\+management/);
});

test("harvestResultUrls keeps /books/(mono|edit)/ links and drops nav noise", () => {
  const urls = TFB.harvestResultUrls(fx("tandfbooks-search.html"));
  assert.equal(urls.length, 3);
  urls.forEach((u) => assert.match(u, /^https:\/\/www\.taylorfrancis\.com\/books\/(mono|edit)\//));
  assert.ok(!urls.some((u) => /about-us|librarians/.test(u)));
});

test("parseArticleMeta reads book Highwire meta (no journal → venue null)", () => {
  const a = TFB.parseArticleMeta(fx("tandfbooks-book.html"));
  assert.equal(a.source, "tandfbooks");
  assert.equal(a.title, "Knowledge Management : Learning from Knowledge Engineering");
  assert.equal(a.doi, "10.1201/9781420041125");
  assert.equal(a.year, "2001");
  assert.equal(a.venue, null);
  assert.ok(a.pdfUrl && a.pdfUrl.indexOf("taylorfrancis.com") !== -1);
});

test("search reads the LIVE DOM (ctx.pageHtml) then enriches each book via fetch", async () => {
  const book = fx("tandfbooks-book.html");
  const ctx = {
    async pageHtml() { return fx("tandfbooks-search.html"); }, // client-rendered listing
    async fetchText() { return book; },
  };
  const r = await TFB.search({ query: "knowledge", page: 1 }, ctx);
  assert.equal(r.source, "tandfbooks");
  assert.ok(r.articles.length >= 1);
  assert.equal(r.articles[0].doi, "10.1201/9781420041125");
});

test("advancedSearch and extractReferences are unsupported for whole books", async () => {
  assert.equal((await LR.run("tandfbooks", "advancedSearch", { criteria: [] })).error, "unsupported");
  assert.equal((await LR.run("tandfbooks", "extractReferences", { url: "x" })).error, "unsupported");
});
