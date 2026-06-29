# Open Library adapter reference
**Endpoint:** `https://openlibrary.org/search.json?q=<q>` — free, no key, CORS-open. **Books** (works).
`&limit=25&page=<n>&fields=title,author_name,first_publish_year,key,ia`.
Advanced: `title=`, `author=`, `first_publish_year=[a TO b]`, `subject=`, `publisher=`.
Map: `docs[]` → title, author_name[], first_publish_year, url=`openlibrary.org<key>`, pdfUrl=`archive.org/details/<ia[0]>` when scanned, type "book". `numFound`. No DOI.
Capabilities: search, advancedSearch. Verified live 2026-06-29 (7.8k hits).
