# OpenCitations adapter reference
**Endpoint:** `https://opencitations.net/index/coci/api/v1/references/<doi>` (and `/citations/<doi>`) — free, CORS-open.
**NOT a search source** — given a DOI it returns the work's outgoing **references** (cited DOIs), so it exposes `extractReferences`. A DOI-based references fallback for sources whose pages don't list references. `citations()` helper returns incoming citations (cited-by) + count.
Map: each entry `{cited}` → `{raw:"DOI <cited>", doi:cited, year:creation[:4], url:doi.org/<cited>}`.
Verified live 2026-06-29 (returns cited-DOI arrays).
