const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const LR = require("../scripts/lib.js");
require("../scripts/adapters/scholar.js");
const SCHOLAR = LR.get("scholar");
const fx = (f) => fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8");

test("buildSearchUrl maps page→start and year range", () => {
  const u = SCHOLAR.buildSearchUrl({ query: "knowledge management", page: 3, firstYear: 2010, lastYear: 2020 });
  assert.ok(u.startsWith("https://scholar.google.com/scholar?"));
  assert.match(u, /q=knowledge%20management|q=knowledge\+management/);
  assert.match(u, /start=20/);
  assert.match(u, /as_ylo=2010/);
  assert.match(u, /as_yhi=2020/);
});

test("buildAdvancedQuery uses Scholar operators", () => {
  const q = SCHOLAR.buildAdvancedQuery([
    { field: "author", term: "Nonaka" },
    { field: "title", term: "knowledge creation" },
  ]);
  assert.match(q, /author:"Nonaka"/);
  assert.match(q, /intitle:"knowledge creation"/);
});

test("parseResults parses .gs_ri results (authors/year/venue/url/citedBy)", () => {
  const r = SCHOLAR.parseResults(fx("scholar-search.html"));
  assert.equal(r.articles.length, 2);
  const a = r.articles[0];
  assert.equal(a.source, "scholar");
  assert.equal(a.title, "Knowledge management (s)");
  assert.deepEqual(a.authors, ["C Despres", "D Chauvel"]);
  assert.equal(a.year, "1999");
  assert.equal(a.venue, "Journal of knowledge Management");
  assert.match(a.url, /emerald\.com/);
  assert.equal(a.citationCount, 1543);
  // [PDF] prefix stripped from the second title
  assert.equal(r.articles[1].title, "Enterprise knowledge management");
});

test("search op returns normalized results via ctx", async () => {
  const ctx = { async fetchText() { return fx("scholar-search.html"); } };
  const r = await SCHOLAR.search({ query: "knowledge management", page: 1 }, ctx);
  assert.equal(r.source, "scholar");
  assert.equal(r.articles.length, 2);
  assert.equal(r.pagination.total, null);
});

test("search surfaces a CAPTCHA block as a challenge error", async () => {
  const ctx = { async fetchText() { return "<html><body>Our systems have detected unusual traffic … /sorry/index</body></html>"; } };
  const r = await SCHOLAR.search({ query: "x" }, ctx);
  assert.equal(r.error, "challenge");
});

test("readFulltext and extractReferences are unsupported", async () => {
  assert.equal((await LR.run("scholar", "readFulltext", { url: "x" })).error, "unsupported");
  assert.equal((await LR.run("scholar", "extractReferences", { url: "x" })).error, "unsupported");
});
