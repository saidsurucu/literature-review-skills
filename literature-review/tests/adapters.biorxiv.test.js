const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const LR = require("../scripts/lib.js");
require("../scripts/adapters/europepmc.js");
require("../scripts/adapters/biorxiv.js");
const BIO = LR.get("biorxiv");
const fx = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8"));

function recordingCtx() {
  const urls = [];
  return { urls, async fetchJson(u) { urls.push(u); return fx("biorxiv-search.json"); }, async fetchText() { return ""; } };
}

test("search injects the bioRxiv/medRxiv publisher filter into the EPMC query", async () => {
  const ctx = recordingCtx();
  await BIO.search({ query: "CRISPR", page: 1 }, ctx);
  const u = decodeURIComponent(ctx.urls[0]);
  assert.match(u, /ebi\.ac\.uk\/europepmc/);
  assert.match(u, /\(CRISPR\) AND \(PUBLISHER:"bioRxiv" OR PUBLISHER:"medRxiv"\)/);
});

test("search relabels results to source 'biorxiv' and keeps the user query", async () => {
  const ctx = recordingCtx();
  const r = await BIO.search({ query: "CRISPR", page: 1 }, ctx);
  assert.equal(r.source, "biorxiv");
  assert.equal(r.query, "CRISPR");
  assert.equal(r.pagination.total, 20281);
  assert.equal(r.articles.length, 2);
  r.articles.forEach((a) => assert.equal(a.source, "biorxiv"));
  assert.equal(r.articles[0].doi, "10.1101/2026.06.15.732405");
});

test("server arg restricts to a single preprint server", async () => {
  const ctx = recordingCtx();
  await BIO.search({ query: "vaccine", server: "medrxiv" }, ctx);
  assert.match(decodeURIComponent(ctx.urls[0]), /AND PUBLISHER:"medRxiv"/);
  assert.ok(decodeURIComponent(ctx.urls[0]).indexOf("bioRxiv") === -1);
});

test("advancedSearch composes EPMC field query + publisher filter", async () => {
  const ctx = recordingCtx();
  await BIO.advancedSearch({ criteria: [{ field: "author", term: "Lovelace" }], firstYear: 2020, lastYear: 2026 }, ctx);
  const u = decodeURIComponent(ctx.urls[0]);
  assert.match(u, /AUTH:"Lovelace"/);
  assert.match(u, /PUB_YEAR:\[2020 TO 2026\]/);
  assert.match(u, /PUBLISHER:"bioRxiv"/);
});
