const { test } = require("node:test");
const assert = require("node:assert");
const LR = require("../scripts/lib.js");

test("register/get round-trips an adapter", () => {
  LR.register("demo", { source: "demo", capabilities: { search: true } });
  assert.equal(LR.get("demo").source, "demo");
  assert.equal(LR.get("missing"), null);
});

test("re-applying the module body preserves the registry (idempotent)", () => {
  const root = { __LR: LR };
  LR.register("keep", { source: "keep" });
  // Simulate a second injection of lib.js onto the same global.
  delete require.cache[require.resolve("../scripts/lib.js")];
  const LR2 = require("../scripts/lib.js");
  LR2.__install(root); // merge onto existing global, preserving _adapters
  assert.equal(root.__LR.get("keep").source, "keep");
});
