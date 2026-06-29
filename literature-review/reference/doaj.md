# DOAJ adapter reference
**Endpoint:** `https://doaj.org/api/search/articles/<query>` — free, no key, CORS-open.
Articles in vetted fully open-access journals. `?pageSize=25&page=<n>`.
Advanced: Lucene fields `bibjson.title|author.name|journal.title|identifier.id|abstract` + `bibjson.year:[a TO b]`.
Map: `results[].bibjson` → title, author[].name, year, journal.title (venue), identifier[type=doi].id, link[type=fulltext].url (pdfUrl). `total`.
Capabilities: search, advancedSearch, readFulltext (OA link). Verified live 2026-06-29 (83k hits).
