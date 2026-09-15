# Improvement audit — 15 September 2026

## Baseline findings

| Priority | Finding | Resolution planned |
| --- | --- | --- |
| Critical | Tests exercise abandoned JavaScript engine, not the TypeScript app | One engine; source-grounded regression tests |
| High | Eight dependency advisories, including Next.js critical advisories | Compatible dependency upgrades and audit |
| High | Blank cases collapse to the same identity; malformed URI escapes crash parsing | Validated parsing and conservative identity |
| High | Saved data is trusted, storage errors are uncaught, hydration differs | Versioned validation, migration, safe loading and recovery |
| High | Only URL stubs and free text; no manual structured case creation | Structured case, legislation, book, chapter, journal and website forms |
| High | Copy loses italics; no portable backup | Rich clipboard, HTML/text export, JSON backup/import |
| Medium | Pinpoint ranges use hyphens, short names are not introduced | En dashes, first-citation short-title definitions |
| Medium | Pointer-only sorting and unannounced status | Keyboard sorting, move buttons, live status, focus handling |
| Medium | Clear/remove are irreversible; every form stays expanded | Undo, focused editor, compact footnote list |
| Medium | README and architecture describe the retired static app | Remove duplicate entry point and refresh documentation |

## Rule provenance and product boundary

Sources are the user-supplied SAL Style Guide Quick Reference (July 2007, 55 PDF pages) and SLR Style Guide 2021 (154 PDF pages). These editions define this implementation; this is not a claim that they are the latest editions.

| Rule | Source |
| --- | --- |
| Prefer SLR citation when available; neutral citation for unreported cases | SAL C–1(b)–(c), PDF p 22; SLR 2–1.1.4, 2–1.2 |
| Paragraph pinpoints, en dash ranges, historical page plus paragraph | SAL C–1(d), PDF p 23; SLR 2–1.1.5 |
| Introduce abbreviated case names after the full citation | SAL C–1(e), PDF p 23 |
| Statutes and subsidiary legislation | SAL C–2–C–3, PDF p 24; SLR 2–2 |
| Books, chapters and legal journals | SAL C–5–C–6, PDF pp 25–26; SLR 2–4–2–5 |
| Internet material and access dates | SAL C–8, PDF p 27 |
| Academic footnote Ibid/Id/supra rules | SAL D–3.1–D–3.3, PDF pp 30–32 |

The app generates **SAL academic footnotes**. SLR 2–1.5 (PDF pp 36–37) addresses judgment paragraph cross-references, with a six-paragraph interval rule; it must not be blended into the academic footnote algorithm. SAL Annual Review also uses a distinct paragraph system (D–3.4). Neither paragraph workflow is selected implicitly.

One structured authority occupies one footnote. Compound footnotes, foreign/international special forms, scientific journals, looseleaf works and unusual source types use a manually reviewed free-text entry; free text never triggers automatic short forms. Report availability and authority accuracy require checking the underlying source. The app must not infer an SLR citation from an unrelated citation appearing in judgment text.

## Verification record

Implementation and verification results are recorded here as the work is completed.
