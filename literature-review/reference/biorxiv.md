# bioRxiv / medRxiv adapter reference

**Mechanism:** bioRxiv's own API has **no keyword search**, but **Europe PMC**
indexes bioRxiv and medRxiv with full metadata. This adapter is a thin
specialization of the `europepmc` adapter — it injects a publisher filter and
relabels `source` to `biorxiv`. Inherits Europe PMC's CORS-open access (fetch from
any origin; `europepmc` adapter must be loaded first).

_Filter verified live 2026-06-29 (≈10k bioRxiv + ≈10k medRxiv hits; all source `PPR`)._

## Query construction
- **Both servers (default):** `(<query>) AND (PUBLISHER:"bioRxiv" OR PUBLISHER:"medRxiv")`
- **One server:** pass `args.server = "biorxiv"` → `PUBLISHER:"bioRxiv"`, or
  `"medrxiv"` → `PUBLISHER:"medRxiv"`.
- **Advanced:** reuses `europepmc.buildQuery(criteria, {firstYear,lastYear})`
  (AUTH/TITLE/JOURNAL/ABSTRACT/DOI + `PUB_YEAR:[…]`), then ANDs the publisher filter.

## Mapping
Delegates to the Europe PMC mapper, then sets `source:"biorxiv"` on the result and
each Article. bioRxiv/medRxiv preprints carry `source:"PPR"` in Europe PMC; the
article `url` is `https://europepmc.org/article/PPR/<id>`.

## Capabilities
`search`, `advancedSearch`, `readFulltext`, `extractReferences` — all delegate to
Europe PMC. **References and full text are sparse for preprints** (many have none
deposited) → graceful empty / `no_fulltext`. The strength is keyword search across
bioRxiv + medRxiv.

## Why not the bioRxiv API
`api.biorxiv.org` only lists by date interval or looks up by DOI — no keyword
search — so Europe PMC is the correct backend for discovery.
