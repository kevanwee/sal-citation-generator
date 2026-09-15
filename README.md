# SAL Citation

A citation workspace for Singapore legal academics and writers. Build **SAL academic footnotes** from structured source details, arrange them in manuscript order, and export the formatted list.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). For a production build:

```sh
npm run build
npm start
```

This is a Next.js application. Deploy with the Next.js preset on Vercel or a Node host. No environment variables or account setup are required. The lookup route requires outbound HTTPS access to `www.elitigation.sg`.

## Writing workflow

1. Name your manuscript and choose a source type: case, legislation, book, chapter, legal journal, website or free text.
2. Enter source details. For Singapore cases, paste an eLitigation URL or neutral citation and choose **Look up** to retrieve the case name. Report citations take precedence; check and enter the SLR citation yourself when available.
3. Add the footnote. Use **Cite again** for another reference to that source, with its own pinpoint. Editing linked bibliographic details updates all linked references.
4. Drag, use Up/Down arrow keys on a reorder handle, or use the up/down buttons to arrange footnotes. Numbering and Ibid/Id/supra references recalculate. Set **Start at** to continue an existing manuscript's numbering.
5. Use **Preview**, **Copy all**, or HTML/text downloads. Rich copy and HTML preserve italics. HTML is a numbered list that can be opened in a word processor; it does not insert native Word footnotes.
6. **Back up** downloads an editable JSON workspace. **Import** replaces the current list; **Undo** restores the previous state. Undo also covers add, edit, reorder, remove and clear operations, up to 30 changes during the session.

Draft source fields stay available when switching source types during a session. Add the footnote or save changes to include it in the saved workspace and backup. Browser reloads do not preserve unsaved form drafts.

## Style scope

Rules are grounded in the supplied **SAL Style Guide Quick Reference, July 2007** and **SLR Style Guide 2021**. See [the audit and rule map](docs/AUDIT.md) for source sections and known boundaries. The guide PDFs are local reference materials and are not distributed by this repository.

- Academic short forms follow SAL D–3.1–D–3.3: Ibid for consecutive identical pinpoints, Id for changed pinpoints, and supra n for later references.
- Case names and book titles retain italics. Case short names are introduced at the first full citation. Paragraph ranges use en dashes; historical report pages can accompany paragraph pinpoints.
- One structured source occupies one footnote. Free text supports compound footnotes and specialised forms and never triggers automatic short forms.
- SLR judgment paragraph cross-references and SAL Annual Review paragraph references are distinct workflows and are not automated here.
- LawNet report lookup, checking authority validity, scientific journals, looseleaf books, specialised foreign and international forms, and native Word footnote insertion are not automated. Use a manually reviewed free-text citation for exceptional forms.

## Privacy and recovery

Saved footnotes stay in browser local storage. Only an explicit lookup sends the neutral citation to the app server and eLitigation; the manuscript and other source details are not submitted. Clearing browser data deletes the local workspace, so download backups regularly.

The app validates imported/saved data, migrates the previous v2 format, preserves unreadable originals for download, reports storage failures, and pauses automatic saving when another tab changes the workspace. When saving is paused, back up your current list before reloading. Importing does not silently overwrite a preserved corrupt original.

## Verification

```sh
npm test                 # Source-grounded engine, backup and lookup tests
npm run typecheck        # Strict TypeScript
npm run format:check     # Consistent source formatting
npm run build            # Production build
npx playwright install chromium
npm run test:e2e         # Desktop/mobile workflows and axe accessibility checks
npm audit
```

GitHub Actions runs these checks on pull requests and on main/improvement branches. Browser tests use the production server on port 3100 and stub external lookups for reproducibility. The underlying lookup handler has separate request-boundary tests.

See [architecture](docs/ARCHITECTURE.md) for the module boundaries and data flow.

## Credits

Created by Kevan Wee. Independent project; not affiliated with or endorsed by the Singapore Academy of Law. See [LICENSE](LICENSE).
