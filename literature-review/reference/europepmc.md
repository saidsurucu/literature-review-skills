# Europe PMC adapter reference

**Endpoint base:** `https://www.ebi.ac.uk/europepmc/webservices/rest` — free, **no
key**, **CORS-open** (fetch from any origin). Broader than PubMed: journals,
preprints (PPR), patents, agricola.

_Shape verified live 2026-06-29 (1.5M hits for "knowledge management")._

## Endpoints
- **Search:** `GET /search?query=<q>&format=json&resultType=core&pageSize=25&page=<n>`
  → `{hitCount, resultList.result[]}`.
- **Advanced:** same endpoint with an EPMC query string. Field map:
  `author→AUTH`, `title→TITLE`, `journal/venue→JOURNAL`, `abstract→ABSTRACT`,
  `doi→DOI`; year range → `PUB_YEAR:[YYYY TO YYYY]`. Items combine with AND/OR/NOT.
- **References:** `GET /<source>/<id>/references?format=json&pageSize=100`
  (source ∈ MED, PMC, PPR…). Pass `{source,id}` or `{id:"MED/123"}`.
- **Full text:** `GET /<source>/<id>/fullTextXML` (open-access XML).

## Mapping (result → Article)
`title←title`, `authors←authorString` (split on `, `), `year←pubYear`,
`venue←journalInfo.journal.title`, `doi←doi`, `citationCount←citedByCount`,
`abstract←abstractText` (tags stripped), `url=https://europepmc.org/article/<source>/<id>`.

## Capabilities
`search`, `advancedSearch`, `readFulltext` (OA full-text XML URL, else
`no_fulltext`), `extractReferences`. `total` = `hitCount`.
