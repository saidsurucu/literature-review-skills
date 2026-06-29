const { test } = require("node:test");
const assert = require("node:assert");
const LR = require("../scripts/lib.js");

test("canonicalDoi strips prefixes and lowercases", () => {
  assert.equal(LR.canonicalDoi("https://doi.org/10.1/AB"), "10.1/ab");
  assert.equal(LR.canonicalDoi("doi:10.1/AB"), "10.1/ab");
  assert.equal(LR.canonicalDoi(null), null);
});

test("normalizeTitle removes punctuation/diacritics/case", () => {
  assert.equal(LR.normalizeTitle("Çığır: A  Study!"), "cigir a study");
});

test("dedupeArticles merges by DOI and records all sources", () => {
  const merged = LR.dedupeArticles([
    { source: "pubmed", title: "X", doi: "10.1/A", abstract: null },
    { source: "emerald", title: "X", doi: "https://doi.org/10.1/a", abstract: "abs" },
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].abstract, "abs");
  assert.deepEqual(merged[0].sources.sort(), ["emerald", "pubmed"]);
});

test("dedupeArticles falls back to title when DOI missing", () => {
  const merged = LR.dedupeArticles([
    { source: "a", title: "Same Title", doi: null },
    { source: "b", title: "same   title", doi: null },
  ]);
  assert.equal(merged.length, 1);
});

test("dedupeArticles does NOT collapse records with neither DOI nor title", () => {
  const merged = LR.dedupeArticles([
    { source: "a", title: null, doi: null },
    { source: "b", title: "", doi: null },
    { source: "c", title: null, doi: null },
  ]);
  assert.equal(merged.length, 3); // each anonymous record kept distinct
});
