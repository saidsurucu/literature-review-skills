(function (root) {
  const LR = (root.__LR) || (typeof require !== "undefined" && require("../lib.js"));
  if (!LR || !LR.get) return;
  // bioRxiv / medRxiv. Their own API has no keyword search, but Europe PMC indexes
  // both with full metadata. So this is a thin specialization of the europepmc
  // adapter: inject a publisher filter and relabel the source. Pass args.server =
  // "biorxiv" | "medrxiv" to restrict to one. References/full text are sparse for
  // preprints (graceful empty/no_fulltext). See reference/biorxiv.md.
  const EPMC = LR.get("europepmc") || (typeof require !== "undefined" && require("./europepmc.js"));

  function pubFilter(server) {
    if (server === "biorxiv") return 'PUBLISHER:"bioRxiv"';
    if (server === "medrxiv") return 'PUBLISHER:"medRxiv"';
    return '(PUBLISHER:"bioRxiv" OR PUBLISHER:"medRxiv")';
  }
  function relabel(r, query) {
    if (!r || r.error) return r;
    r.source = "biorxiv";
    if (query != null) r.query = query;
    (r.articles || []).forEach((a) => { a.source = "biorxiv"; });
    return r;
  }

  async function search(args, ctx) {
    args = args || {};
    const q = "(" + (args.query || "*") + ") AND " + pubFilter(args.server);
    return relabel(await EPMC.search({ query: q, page: args.page }, ctx), args.query);
  }
  async function advancedSearch(args, ctx) {
    args = args || {};
    const epmcQ = EPMC.buildQuery(args.criteria, args);
    const q = (epmcQ ? "(" + epmcQ + ") AND " : "") + pubFilter(args.server);
    return relabel(await EPMC.search({ query: q, page: args.page }, ctx), epmcQ);
  }
  async function extractReferences(args, ctx) {
    const r = await EPMC.extractReferences(args, ctx);
    if (r && !r.error) r.source = "biorxiv";
    return r;
  }
  async function readFulltext(args, ctx) {
    const r = await EPMC.readFulltext(args, ctx);
    if (r && !r.error) r.source = "biorxiv";
    return r;
  }

  const adapter = {
    source: "biorxiv", origin: EPMC ? EPMC.origin : "https://www.ebi.ac.uk/europepmc/webservices/rest", pageSize: 25, corsOpen: true,
    capabilities: { search: true, advancedSearch: true, readFulltext: true, extractReferences: true },
    pubFilter, search, advancedSearch, extractReferences, readFulltext,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
  LR.register("biorxiv", adapter);
})(typeof globalThis !== "undefined" ? globalThis : this);
