import test from "node:test";
import assert from "node:assert/strict";
import {
  computeCitationOutputs as compute,
  parseElitigationUrl,
  validateFootnote,
} from "../lib/citationEngine";
import { createFootnote } from "../lib/schema";
import {
  parseWorkspace,
  emptyWorkspace,
  updateFootnote,
} from "../lib/workspace";
import { exportHtml } from "../lib/export";
import { extractCaseName } from "../lib/elitigation";
import type { SourceType } from "../lib/types";
const note = (type: SourceType, fields: Record<string, string>) => {
  const n = createFootnote(type);
  n.fields = { ...n.fields, ...fields };
  return n;
};
const caseNote = (extra = {}) =>
  note("case", {
    caseName: "Tan Kim Seng v Victor Adam Ibrahim",
    year: "2003",
    court: "SGCA",
    caseNo: "49",
    ...extra,
  });
test("parses URL, encoded and neutral citations without trusting other hosts", () => {
  for (const input of [
    "https://www.elitigation.sg/gd/s/2003_SGCA_049",
    "2003_SGCA_49",
    "[2003] SGCA 49",
    "%5B2003%5D%20SGCA%2049",
    "https://elitigation.sg/gd/gd/2003_SGCA_49/pdf",
  ])
    assert.deepEqual(parseElitigationUrl(input), {
      year: "2003",
      court: "SGCA",
      caseNo: "49",
    });
  for (const input of [
    "%ZZ",
    "https://evil.org/2003_SGCA_49",
    "https://elitigation.sg.evil.org/gd/s/2003_SGCA_49",
    "2003_SGCA_49junk",
    "[2003] SGCA 0",
    "https://user@elitigation.sg/gd/s/2003_SGCA_49",
  ])
    assert.equal(parseElitigationUrl(input), null);
});
test("SAL C–1(d): paragraph ranges use en dashes", () =>
  assert.equal(
    compute([caseNote({ pinpoint: "[10]", pinpointEnd: "12" })])[0].text,
    "Tan Kim Seng v Victor Adam Ibrahim [2003] SGCA 49 at [10]–[12].",
  ));
test("SAL C–1: report preference, introduced short title and historical page", () => {
  const out = compute([
    caseNote({
      caseName: "Andermatt Investments Pte Ltd v Comptroller of Income Tax",
      reportCitation: "[1995] 3 SLR 451",
      shortName: "Andermatt",
      page: "460",
      pinpoint: "27",
    }),
  ])[0];
  assert.equal(
    out.text,
    "Andermatt Investments Pte Ltd v Comptroller of Income Tax [1995] 3 SLR 451 (“Andermatt”) at 460, [27].",
  );
  assert.match(out.html, /<i>Andermatt<\/i>/);
});
test("SAL D–3: Ibid, Id, and supra; offsets and reordering recalculate", () => {
  const a = caseNote({ shortName: "Tan Kim Seng", pinpoint: "10" }),
    b = caseNote({ pinpoint: "12" }),
    gap = note("text", { text: "See discussion above." });
  const out = compute([a, a, b, gap, b], 20);
  assert.deepEqual(
    out.map((o) => o.kind),
    ["full", "ibid", "id", "manual", "supra"],
  );
  assert.equal(out[2].text, "Id, at [12].");
  assert.equal(out[4].text, "Tan Kim Seng, supra n 20, at [12].");
  assert.equal(compute([gap, a, b], 20)[2].kind, "id");
  assert.equal(
    compute([a, gap, b], 20)[2].text,
    "Tan Kim Seng, supra n 20, at [12].",
  );
});
test("blank cases and same-name different decisions never collapse", () => {
  assert.deepEqual(
    compute([createFootnote("case"), createFootnote("case")]).map(
      (o) => o.kind,
    ),
    ["full", "full"],
  );
  assert.equal(
    compute([caseNote(), caseNote({ caseNo: "50" })])[1].kind,
    "full",
  );
});
test("normalized same pinpoint and removal of pinpoint", () => {
  assert.equal(
    compute([
      caseNote({ pinpoint: "10" }),
      caseNote({ pinpoint: "[10]", pinpointEnd: "10" }),
    ])[1].text,
    "Ibid.",
  );
  assert.equal(
    compute([caseNote({ pinpoint: "10" }), caseNote()])[1].kind,
    "full",
  );
});
test("SAL C–5 book and C–6 journal/chapter examples", () => {
  const book = note("book", {
    author: "Colin Tapper",
    title: "Cross and Tapper on Evidence",
    publisher: "Butterworths",
    edition: "9th Ed",
    year: "1999",
    pinpoint: "74",
  });
  assert.equal(
    compute([book])[0].text,
    "Colin Tapper, Cross and Tapper on Evidence (Butterworths, 9th Ed, 1999) at p 74.",
  );
  assert.equal(
    compute([
      note("journal", {
        author: "Peter Birks",
        title: "No Consideration: Restitution After Void Contracts",
        year: "1993",
        volume: "23",
        journal: "UWALR",
        firstPage: "195",
        pinpoint: "203",
      }),
    ])[0].text,
    "Peter Birks, “No Consideration: Restitution After Void Contracts” (1993) 23 UWALR 195 at 203.",
  );
  assert.equal(
    compute([
      note("chapter", {
        author: "Walter Woon",
        title: "The Applicability of English Law in Singapore",
        bookTitle: "The Singapore Legal System",
        editor: "Kevin Y L Tan ed",
        publisher: "Singapore University Press",
        edition: "2nd Ed",
        year: "1999",
        chapter: "6",
        pinpoint: "230",
      }),
    ])[0].text,
    "Walter Woon, “The Applicability of English Law in Singapore” in The Singapore Legal System (Kevin Y L Tan ed) (Singapore University Press, 2nd Ed, 1999) ch 6 at p 230.",
  );
  assert.equal(
    compute([book, { ...book, fields: { ...book.fields, year: "2000" } }])[1]
      .kind,
    "full",
  );
});
test("year-based journal brackets and statute provisions", () => {
  assert.match(
    compute([
      note("journal", {
        author: "Michael Hor",
        title: "Terrorism and the Criminal Law",
        year: "2002",
        yearStyle: "Square (year-based)",
        journal: "Sing JLS",
        firstPage: "30",
      }),
    ])[0].text,
    /\[2002\] Sing JLS 30/,
  );
  assert.equal(
    compute([
      note("legislation", {
        title: "Misuse of Drugs Act",
        reference: "Cap 185, 2001 Rev Ed",
        provision: "s 2(1)",
      }),
    ])[0].text,
    "Misuse of Drugs Act (Cap 185, 2001 Rev Ed) s 2(1).",
  );
});
test("invalid ranges and incomplete sources are visible", () => {
  assert.ok(
    validateFootnote(caseNote({ pinpoint: "12", pinpointEnd: "10" })).length,
  );
  assert.ok(validateFootnote(caseNote({ pinpointEnd: "10" })).length);
  assert.ok(
    validateFootnote(note("website", { url: "javascript:alert(1)" })).length,
  );
});
test("all output escapes HTML and preserves manual punctuation", () => {
  const out = compute([
    caseNote({ caseName: "<img src=x onerror=alert(1)>" }),
    note("text", { text: "Why?" }),
    note("text", { text: "An omission…" }),
  ]);
  assert.ok(!out[0].html.includes("<img"));
  assert.equal(out[1].text, "Why?");
  assert.equal(out[2].text, "An omission…");
  assert.ok(
    !exportHtml(out, 1, "</title><script>x</script>").includes("<script>"),
  );
});
test("workspace round-trip, legacy migration and hostile backups", () => {
  const workspace = { ...emptyWorkspace(), footnotes: [caseNote()] };
  assert.deepEqual(parseWorkspace(JSON.stringify(workspace)), workspace);
  const migrated = parseWorkspace(
    JSON.stringify([
      {
        type: "case",
        caseName: "A",
        year: "2003",
        court: "SGCA",
        caseNo: "49",
        paraStart: "10",
      },
    ]),
  );
  assert.equal(migrated.footnotes[0].fields.pinpoint, "10");
  for (const raw of [
    "null",
    "{}",
    "[null]",
    JSON.stringify({ ...workspace, version: 99 }),
    JSON.stringify({
      ...workspace,
      footnotes: [workspace.footnotes[0], workspace.footnotes[0]],
    }),
  ])
    assert.throws(() => parseWorkspace(raw));
});
test("linked edits propagate bibliography but retain independent pinpoints", () => {
  const a = caseNote({ pinpoint: "10" }),
    b = { ...a, id: "repeat", fields: { ...a.fields, pinpoint: "20" } };
  const out = updateFootnote([a, b], {
    ...a,
    fields: { ...a.fields, reportCitation: "[2003] 1 SLR 100", pinpoint: "11" },
  });
  assert.equal(out[1].fields.reportCitation, "[2003] 1 SLR 100");
  assert.equal(out[1].fields.pinpoint, "20");
  assert.doesNotThrow(() =>
    parseWorkspace(JSON.stringify({ ...emptyWorkspace(), footnotes: out })),
  );
});
test("lookup extracts only a matching judgment header, never citations in the body", () => {
  const html =
    '<title>[2023] SGCA 5</title><div class="HN-CaseName"><span>A</span> <span>v</span> <span>B &amp; C</span></div><p>Other v Case [2000] 1 SLR 100</p>';
  assert.equal(extractCaseName(html, "[2023] SGCA 5"), "A v B & C");
  assert.equal(extractCaseName(html, "[2024] SGCA 5"), null);
});
