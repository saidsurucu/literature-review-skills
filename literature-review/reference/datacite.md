# DataCite adapter reference
**Endpoint:** `https://api.datacite.org/dois?query=<q>` — free, no key, CORS-open.
DOIs for **datasets, software, theses** and other research outputs beyond articles.
`&page[size]=25&page[number]=<n>`. Advanced: `titles.title|creators.name|publisher|types.resourceTypeGeneral` + `created:>=YYYY`.
Map: `data[].attributes` → titles[0].title, creators[].name, publicationYear, publisher (venue), doi, types.resourceTypeGeneral (type), descriptions[0].description, url. `meta.total`.
Capabilities: search, advancedSearch. Verified live 2026-06-29 (125k hits).
