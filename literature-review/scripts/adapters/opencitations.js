(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.normalizeArticle) return;
  // OpenCitations (opencitations.net, COCI index) — free, CORS-open. NOT a search
  // source: given a DOI it returns the work's outgoing references (and incoming
  // citations). So it exposes extractReferences (a DOI-based fallback for sources
  // whose own pages don't list references). See reference/opencitations.md.
  const BASE = "https://opencitations.net/index/coci/api/v1";
  function clean(doi) { return LR.canonicalDoi ? LR.canonicalDoi(doi) : (doi ? String(doi).toLowerCase() : null); }
  async function extractReferences(args, ctx) {
    const doi = clean(args.doi || args.id);
    if (!doi) return { error: "bad_request", source: "opencitations", note: "pass a DOI" };
    const arr = await ctx.fetchJson(BASE + "/references/" + encodeURIComponent(doi));
    if (!Array.isArray(arr)) return { error: "not_found", source: "opencitations", note: "no citation data" };
    const refs = arr.map((r) => ({ raw: "DOI " + (r.cited || ""), doi: clean(r.cited), title: null, authors: null, year: (r.creation || "").slice(0, 4) || null, url: r.cited ? "https://doi.org/" + r.cited : null }));
    return { source: "opencitations", doi: doi, references: refs };
  }
  async function citations(args, ctx) {
    const doi = clean(args.doi || args.id);
    const arr = await ctx.fetchJson(BASE + "/citations/" + encodeURIComponent(doi));
    if (!Array.isArray(arr)) return { error: "not_found", source: "opencitations" };
    return { source: "opencitations", doi: doi, citationCount: arr.length, citedBy: arr.map((r) => clean(r.citing)) };
  }
  const adapter = {
    source: "opencitations", origin: "https://opencitations.net", corsOpen: true,
    capabilities: { extractReferences: true }, // plus citations() helper (forward citations)
    extractReferences: extractReferences, citations: citations,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("opencitations", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
