# arXiv adapter reference

**Endpoint:** `https://export.arxiv.org/api/query` — free Atom-XML API.
**NOT CORS-open** — navigate to `export.arxiv.org` first (e.g.
`/api/query?search_query=all:test&max_results=1`) so the fetch is same-origin.

_Shape verified live 2026-06-29 (171k hits for "knowledge management")._

## Endpoints
- **Search:** `?search_query=all:<q>&start=<(n-1)*25>&max_results=25` → Atom feed.
- **Advanced:** `search_query` field prefixes — `title→ti`, `author→au`,
  `abstract→abs`, `category→cat`, `journal→jr`; joined with AND/OR/NOT. Year range
  → `submittedDate:[YYYYMMDD TO YYYYMMDD]`.

## Mapping (Atom entry → Article)
`title←title`, `authors←author/name`, `year←published[:4]`,
`venue="arXiv (<primary category>)"`, `doi←arxiv:doi` (usually null),
`url←id` (the abs URL), `abstract←summary`, `type="preprint"`,
`pdfUrl←link[title=pdf]`. `total←opensearch:totalResults`. Parsed with
`getElementsByTagName` (namespaced tags) for jsdom/browser parity.

## Capabilities
`search`, `advancedSearch`, `readFulltext` (PDFs always open). **No
`extractReferences`** — the arXiv API exposes no bibliography (use OpenAlex/Crossref
for an arXiv paper's references by DOI when one exists).

## Related preprint servers
bioRxiv/medRxiv have no usable keyword-search API; their preprints are indexed by
**Europe PMC** (source `PPR`), **OpenAlex**, and **Crossref** — query those instead
of a dedicated adapter.
