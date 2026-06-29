# OpenAlex adapter reference

**Endpoint base:** `https://api.openalex.org` — free, **no API key**, **CORS-open**
(fetch from any origin; no navigate-first). Send `mailto=` for the polite pool.

_Shape verified live 2026-06-29 (6.6M results for "knowledge management")._

## Endpoints
- **Search:** `GET /works?search=<q>&per-page=25&page=<n>&mailto=` → `{meta.count, results[]}`.
- **Advanced:** `GET /works?filter=<f1,f2>&search=<q>&…`. Field map:
  `title→title.search`, `author→raw_author_name.search`, `year→publication_year`,
  `venue/journal→primary_location.source.display_name.search`; year range →
  `from_publication_date:YYYY-01-01`,`to_publication_date:YYYY-12-31`.
- **Single work:** `GET /works/<openalex-id|https://doi.org/DOI>` (for references / OA PDF).
- **Resolve references:** `GET /works?filter=openalex_id:W1|W2|…&select=id,display_name,doi,publication_year`.

## Mapping (work → Article)
`title←display_name` (HTML tags stripped), `authors←authorships[].author.display_name`,
`year←publication_year`, `venue←primary_location.source.display_name`,
`doi←canonical(doi)`, `citationCount←cited_by_count`,
`pdfUrl←best_oa_location.pdf_url`, `abstract←` reconstructed from
`abstract_inverted_index` (positions → words).

## Capabilities
`search`, `advancedSearch`, `readFulltext` (OA PDF only, else `no_fulltext`),
`extractReferences` (resolves `referenced_works` IDs to titles — capped at 50, two
API calls). `total` = `meta.count`.

## Notes
Keyless and CORS-open makes OpenAlex the best cross-publisher default — one search
spans the whole corpus with citation counts. Pair with per-publisher adapters for
full text behind subscriptions.
