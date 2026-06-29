# Crossref adapter reference

**Endpoint base:** `https://api.crossref.org` — free, **no API key**, **CORS-open**
(fetch from any origin). Send `mailto=` for the polite pool.

_Shape verified live 2026-06-29 (4.9M results for "knowledge management")._

## Endpoints
- **Search:** `GET /works?query=<q>&rows=20&offset=<(n-1)*20>&mailto=` →
  `{message:{total-results, items[]}}`.
- **Advanced:** `GET /works?query.title=…&query.author=…&filter=from-pub-date:…,until-pub-date:…`.
  Field map: `title→query.title`, `author→query.author`,
  `venue/journal→query.container-title`, `abstract→query.bibliographic`.
- **Single work:** `GET /works/<doi>` → `message` (for `reference[]` / `link[]`).

## Mapping (item → Article)
`title←title[0]`, `authors←author[].given+family` (or `author[].name`),
`year←issued/published.date-parts[0][0]`, `venue←container-title[0]`,
`doi←DOI` (lowercased), `abstract←abstract` (JATS tags stripped),
`citationCount←is-referenced-by-count`, `pdfUrl←link[] where content-type=pdf`.

## References
`extractReferences(doi)` reads `message.reference[]`: each entry is either
`unstructured` text or composed from `author + year + article-title/journal-title`,
plus a `DOI` when deposited. Coverage depends on whether the publisher deposited
references to Crossref.

## Capabilities
`search`, `advancedSearch`, `readFulltext` (only when a full-text `link` is
deposited, else `no_fulltext`), `extractReferences`. `total` = `message.total-results`.
