# HAL adapter reference
**Endpoint:** `https://api.archives-ouvertes.fr/search/?q=<q>&wt=json` — France's open archive. Free, no key, CORS-open. Solr.
`&rows=25&start=<offset>&fl=title_s,authFullName_s,producedDateY_i,doiId_s,uri_s,abstract_s,journalTitle_s,docType_s,fileMain_s`.
Advanced: text fields `title_t|authFullName_t|abstract_t|journalTitle_t`, `doiId_s` + `producedDateY_i:[a TO b]`.
Map: `response.docs[]` → title_s[0], authFullName_s[], producedDateY_i, journalTitle_s (venue), doiId_s, uri_s (url), abstract_s[0], docType_s (type), fileMain_s (pdfUrl). `response.numFound`.
Capabilities: search, advancedSearch, readFulltext. Verified live 2026-06-29 (26k hits).
