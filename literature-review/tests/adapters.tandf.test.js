const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const LR = require("../scripts/lib.js");
require("../scripts/adapters/tandf.js");
const TANDF = LR.get("tandf");
const fx = (f) => fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8");

test("buildSearchUrl hits /action/doSearch with AllField", () => {
  const u = TANDF.buildSearchUrl({ query: "climate policy" });
  assert.ok(u.startsWith("https://www.tandfonline.com/action/doSearch?"));
  assert.match(u, /AllField=climate%20policy|AllField=climate\+policy/);
});

test("parseArticleMeta reads Dublin Core (dc.*) into an Article", () => {
  const a = TANDF.parseArticleMeta(fx("tandf-article.html"));
  assert.equal(a.source, "tandf");
  assert.equal(a.title, "The politics of health care: lessons for welfare state research");
  assert.ok(a.authors.length >= 1);
  assert.equal(a.authors[0], "Carsten Jensen"); // double space collapsed
  assert.equal(a.doi, "10.1080/01402382.2026.2685069"); // scheme=doi, not publisher-id
  assert.equal(a.year, "2026");
  assert.equal(a.venue, "West European Politics");
  assert.equal(a.pdfUrl, "https://www.tandfonline.com/doi/pdf/10.1080/01402382.2026.2685069");
  assert.ok(a.abstract && a.abstract.length > 0);
});

test("harvestResultUrls keeps only /doi/full/ links (abs filtered out, no dupes)", () => {
  const urls = TANDF.harvestResultUrls(fx("tandf-search.html"));
  assert.equal(urls.length, 3);
  urls.forEach((u) => assert.match(u, /^https:\/\/www\.tandfonline\.com\/doi\/full\//));
  assert.ok(!urls.some((u) => /\/doi\/abs\//.test(u)));
  // ?needAccess=true stripped
  assert.ok(!urls.some((u) => u.indexOf("?") !== -1));
});

test("parseReferences falls back to DOM .references li (no citation_reference meta)", () => {
  const refs = TANDF.parseReferences(fx("tandf-article.html"));
  assert.equal(refs.length, 2);
  assert.match(refs[0].raw, /Esping-Andersen/);
});

test("search op harvests /doi/full/ listing then enriches via dc.* meta", async () => {
  const article = fx("tandf-article.html");
  const ctx = { async fetchText(u) { return u.indexOf("/action/doSearch") !== -1 ? fx("tandf-search.html") : article; } };
  const r = await TANDF.search({ query: "climate", page: 1 }, ctx);
  assert.equal(r.source, "tandf");
  assert.ok(r.articles.length >= 1);
  assert.equal(r.articles[0].doi, "10.1080/01402382.2026.2685069");
});
