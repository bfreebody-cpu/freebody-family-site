# Freebody Family Archive — public website

This repository contains the publication-safe edition of the Freebody Family
Archive. It carries forward Graham Freebody's family-history research while
keeping the complete Family Historian project, living-person information and
unreviewed archive material private.

The deployable static website is in [`dist/`](dist/). It has no database,
accounts, forms, advertising, analytics, cookies or third-party scripts.

## What this first edition contains

- 227 historical people with explicit death evidence, plus Graham Freebody as
  the explicitly approved original author
- 99 family groups containing only people independently eligible for release
- An interactive, Graham-centred lineage tree with ancestor and descendant views
- Graham Freebody's original introduction to the work
- The complete preserved photograph collection: 49 unique files represented by
  52 original-page image references
- Local browser search over the public records

Apart from Graham's deliberately minimized profile, it does **not** contain the GEDCOM, living or uncertain person records, free-text
genealogy notes, raw source records, private identifiers or guestbook content. See
[`PUBLICATION_POLICY.md`](PUBLICATION_POLICY.md) for the complete boundary.

## View the website locally

The simplest full preview uses Python's small local web server.

On Windows, open PowerShell in this repository and run:

```powershell
py -m http.server 8781 --bind 127.0.0.1 --directory dist
```

Then open <http://127.0.0.1:8781/>. Stop the server with `Ctrl+C`.

## Editing and updating

Family relationships, dates and events are maintained in Family Historian,
not by editing generated person pages. A reviewed export from the private
master replaces the generated files under `dist/`.

Public introductions and explanatory copy will be moved into simple editable
content files as the authoring handoff is completed. Until then, treat files
under `dist/people/` and `dist/families/` as generated output.

GitHub Desktop can be used to fetch, review, commit and push changes without
using command-line Git. The intended release workflow is:

1. Graham updates genealogy in Family Historian or public narrative content.
2. Changes are pushed to a draft branch with GitHub Desktop.
3. Ben reviews the private deployment preview and publication boundary.
4. An approved merge to the production branch releases the website.

## Hosting

This is a buildless static site. For Cloudflare Pages, use:

- Build command: leave empty
- Build output directory: `dist`
- Production branch: `main`

Connect a custom domain only after the preview and release workflow has been
accepted.

## Source authority

The Family Historian GEDCOM remains the sole master family record. This public
website is a limited presentation layer and is not intended to be an exhaustive
encyclopedia or a replacement for genealogy software.

