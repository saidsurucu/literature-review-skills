# Unpaywall adapter reference
**Endpoint:** `https://api.unpaywall.org/v2/<doi>?email=<email>` — free, CORS-open, email required.
**NOT a search source** — resolves a DOI to an open-access PDF, so it exposes only `readFulltext`. Use it as a cross-source OA fallback: take a DOI from any search result and get the best OA copy.
Returns `{is_oa, best_oa_location:{url_for_pdf,url,host_type,version}}` → `{pdfUrl, hostType, version, isOA}`; `{error:"no_fulltext"}` when not OA, `{error:"not_found"}` when the DOI is unknown.
Verified live 2026-06-29.
