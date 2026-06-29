# PubMed adapter reference

**Home origin:** `https://eutils.ncbi.nlm.nih.gov` (navigate to a real endpoint
first, e.g. `…/entrez/eutils/einfo.fcgi?db=pubmed&retmode=json` — the bare root
and `www.ncbi.nlm.nih.gov` are different origins and would trigger CORS).

**Access style:** NCBI E-utilities JSON/XML API, called via in-page `fetch`. No
DOM scraping. No login needed.

## Endpoints (all under `…/entrez/eutils/`)

| Op | Endpoint | Notes |
|----|----------|-------|
| search | `esearch.fcgi` | `db=pubmed&retmode=json&term=…&retstart=&retmax=` → `{count, idlist}` |
| (search part 2) | `esummary.fcgi` | `db=pubmed&retmode=json&id=<csv>` → per-uid summary |
| references | `efetch.fcgi` | `db=pubmed&retmode=xml&id=<PMID>` → `ReferenceList/Reference/Citation` |
| fulltext | `elink.fcgi` | `dbfrom=pubmed&db=pmc&id=<PMID>` → open-access PMCID, then PMC PDF URL |

## Required params (every call)
`tool=literature-review`, `email=…`, optional `api_key=…`. **Throttle ≤3 req/s**
without a key (10 with one). Batch `esummary` IDs in one call. Ref: NCBI NBK25497.

## Pagination
`retstart = (page-1) * pageSize`, `retmax = pageSize` (default 20). `total` =
`esearchresult.count` (record count).

## Advanced field map (`criteria.field` → PubMed `[Tag]`)
`title→Title`, `abstract→Title/Abstract`, `author→Author`, `journal→Journal`,
`year→Publication Date`, `doi→DOI`, `affiliation→Affiliation`, `mesh→MeSH Terms`.
Year range becomes `(<firstYear>[PDAT] : <lastYear>[PDAT])`.

## Field mapping (esummary → Article)
`title←title`, `authors←authors[].name`, `year←/(\d{4})/ of pubdate`,
`venue←fulljournalname||source`, `doi←articleids[idtype=doi].value`,
`url=https://pubmed.ncbi.nlm.nih.gov/<uid>/`.

## Fulltext
`readFulltext` returns a PMC PDF URL only when `elink` reports an open-access PMC
copy; otherwise `{error:"no_fulltext", note:"no open-access PMC copy"}`. Run the
returned `pdfUrl` through `__LR_pdf` on the PMC origin.

_Provenance: endpoints/params verified against NCBI E-utilities docs, 2026-06-29._
