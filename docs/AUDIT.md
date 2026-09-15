# Improvement audit — 15 September 2026

## Baseline findings

| Priority | Finding                                                                        | Resolution delivered                                                   |
| -------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Critical | Tests exercise abandoned JavaScript engine, not the TypeScript app             | One engine; source-grounded regression tests                           |
| High     | Eight dependency advisories, including Next.js critical advisories             | Compatible dependency upgrades and audit                               |
| High     | Blank cases collapse to the same identity; malformed URI escapes crash parsing | Validated parsing and conservative identity                            |
| High     | Saved data is trusted, storage errors are uncaught, hydration differs          | Versioned validation, migration, safe loading and recovery             |
| High     | Only URL stubs and free text; no manual structured case creation               | Structured case, legislation, book, chapter, journal and website forms |
| High     | Copy loses italics; no portable backup                                         | Rich clipboard, HTML/text export, JSON backup/import                   |
| Medium   | Pinpoint ranges use hyphens, short names are not introduced                    | En dashes, first-citation short-title definitions                      |
| Medium   | Pointer-only sorting and unannounced status                                    | Keyboard sorting, move buttons, live status, focus handling            |
| Medium   | Clear/remove are irreversible; every form stays expanded                       | Undo, focused editor, compact footnote list                            |
| Medium   | README and architecture describe the retired static app                        | Remove duplicate entry point and refresh documentation                 |

## Rule provenance and product boundary

Sources are the user-supplied SAL Style Guide Quick Reference (July 2007, 55 PDF pages) and SLR Style Guide 2021 (154 PDF pages). These editions define this implementation; this is not a claim that they are the latest editions.

| Rule                                                                      | Source                                       |
| ------------------------------------------------------------------------- | -------------------------------------------- |
| Prefer SLR citation when available; neutral citation for unreported cases | SAL C–1(b)–(c), PDF p 22; SLR 2–1.1.4, 2–1.2 |
| Paragraph pinpoints, en dash ranges, historical page plus paragraph       | SAL C–1(d), PDF p 23; SLR 2–1.1.5            |
| Introduce abbreviated case names after the full citation                  | SAL C–1(e), PDF p 23                         |
| Statutes and subsidiary legislation                                       | SAL C–2–C–3, PDF p 24; SLR 2–2               |
| Books, chapters and legal journals                                        | SAL C–5–C–6, PDF pp 25–26; SLR 2–4–2–5       |
| Internet material and access dates                                        | SAL C–8, PDF p 27                            |
| Academic footnote Ibid/Id/supra rules                                     | SAL D–3.1–D–3.3, PDF pp 30–32                |

The app generates **SAL academic footnotes**. SLR 2–1.5 (PDF pp 36–37) addresses judgment paragraph cross-references, with a six-paragraph interval rule; it must not be blended into the academic footnote algorithm. SAL Annual Review also uses a distinct paragraph system (D–3.4). Neither paragraph workflow is selected implicitly.

One structured authority occupies one footnote. Compound footnotes, foreign/international special forms, scientific journals, looseleaf works and unusual source types use a manually reviewed free-text entry; free text never triggers automatic short forms. Report availability and authority accuracy require checking the underlying source. The app must not infer an SLR citation from an unrelated citation appearing in judgment text.

## Verification record

Local verification completed on 15 September 2026:

- **17 engine/storage/lookup tests passed.** Fixtures cover supplied SAL examples, short forms and offsets, report preference, edited books, year-based journals, pinpoint ranges, escaped output, legacy migration, invalid imports, linked updates, and bounded API behavior.
- **20 browser tests passed** across desktop Chromium and emulated Pixel 7. Coverage includes all seven source forms, repeat/edit/reorder/undo/reload, HTML and JSON downloads, import, rich clipboard italics, source draft switching, lookup success/failure, corrupt storage, quota failure, and conflicting tabs.
- **Axe scans reported zero WCAG A/AA violations** for the empty and populated views on both tested viewports. Keyboard reorder and visible move controls were exercised. This is automated and targeted manual verification, not a certification or a substitute for testing with screen-reader users.
- **TypeScript, formatting checks, production build and git whitespace checks passed.**
- **npm audit reports zero known vulnerabilities**, down from eight. Next.js minimum and lockfile now use the patched 16.3 line.
- **Live eLitigation smoke check succeeded** for `[2023] SGCA 5`, returning `IIa Technologies Pte Ltd v Element Six Technologies Ltd`. External lookup is stubbed in browser CI; request boundaries are tested separately.
- Desktop and mobile screenshots were inspected. The layout now has a source selector, focused editor, readable footnote list and preview, persistent export controls, and mobile section links. Preview numbering and low-contrast source labels were corrected during the audit.

## Operational and product limits

- Sources are supplied by the writer. Automatic lookup retrieves a matching public case header, not LawNet report availability or legal validity.
- Citation identity is conservative: independently entered report-only and neutral-only entries are not automatically merged. **Cite again** links source details reliably.
- Backups and browser saving contain added footnotes, not unsaved source drafts. Source drafts survive type switching during the session only. Undo history lasts for the current session.
- The supported output is a numbered academic footnote list. Native Word footnote insertion, compound-source automation and the special source families identified above remain future extensions.
- Chromium desktop/mobile emulation was verified. Real Safari/Firefox, assistive-technology user testing and production traffic testing remain release follow-ups.

## Maintenance controls

One TypeScript engine now serves the product and its tests. The retired static application was removed. GitHub Actions checks formatting, types, tests, dependency advisories, production build and desktop/mobile browser workflows. Dependencies are installed from the committed lockfile; the supplied PDFs and audit scratch data are not published.
