const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const LR = require("../scripts/lib.js");
require("../scripts/adapters/pubmed.js");
require("../scripts/adapters/emerald.js");

const OPS = ["search", "advancedSearch", "readFulltext", "extractReferences"];
const SOURCES = ["pubmed", "emerald"];

test("every adapter registers, declares capabilities, and has op methods or pipelines", () => {
  SOURCES.forEach((s) => {
    const a = LR.get(s);
    assert.ok(a, s + " registered");
    OPS.forEach((op) => {
      const supported = !!(a.capabilities && a.capabilities[op]);
      if (supported) {
        const hasMethod = typeof a[op] === "function";
        const hasPipeline = typeof LR.pipelines[op] === "function" && typeof a.buildSearchUrl === "function";
        assert.ok(hasMethod || hasPipeline, s + " supports " + op + " but exposes no method/pipeline");
      }
    });
  });
});

test("SKILL.md description names every v1 source and lists the capability matrix", () => {
  const md = fs.readFileSync(path.join(root, "SKILL.md"), "utf8");
  ["PubMed", "Emerald", "Scopus", "Web of Science", "Google Scholar", "Wiley", "Taylor", "Brill"].forEach((name) => {
    assert.ok(md.includes(name), "SKILL.md must mention " + name);
  });
  assert.match(md, /capability matrix/i);
  assert.ok(md.includes("https://eutils.ncbi.nlm.nih.gov"), "must document exact PubMed origin");
});

test("each adapter reference doc exists and records the home origin", () => {
  const pm = fs.readFileSync(path.join(root, "reference", "pubmed.md"), "utf8");
  const em = fs.readFileSync(path.join(root, "reference", "emerald.md"), "utf8");
  assert.ok(pm.includes("https://eutils.ncbi.nlm.nih.gov"));
  assert.ok(em.includes("https://www.emerald.com"));
});

test("committed HTML/JSON fixtures carry provenance", () => {
  const dir = path.join(__dirname, "fixtures");
  fs.readdirSync(dir).forEach((f) => {
    const txt = fs.readFileSync(path.join(dir, f), "utf8");
    assert.match(txt, /provenance|captured/i, f + " missing provenance header");
  });
});
