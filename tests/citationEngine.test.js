import test from "node:test";
import assert from "node:assert/strict";
import {
  computeCitationOutputs,
  parseElitigationUrl,
} from "../citationEngine.js";

test("parseElitigationUrl extracts neutral citation fields", () => {
  const parsed = parseElitigationUrl("https://www.elitigation.sg/gd/s/2023_SGCA_5");
  assert.deepEqual(parsed, { year: "2023", court: "SGCA", caseNo: "5" });
});

test("parseElitigationUrl returns null for invalid URL", () => {
  assert.equal(parseElitigationUrl("https://example.com/not-a-case"), null);
});

test("formats first case citation in full with pinpoint", () => {
  const notes = [
    {
      type: "case",
      caseName: "Tan Kim Seng v Victor Adam Ibrahim",
      year: "2003",
      court: "SGCA",
      caseNo: "49",
      paraStart: "10",
      paraEnd: "12",
      shortName: "",
      reportCitation: "",
    },
  ];

  const output = computeCitationOutputs(notes)[0];
  assert.equal(
    output.text,
    "Tan Kim Seng v Victor Adam Ibrahim [2003] SGCA 49 at [10]-[12].",
  );
});

test("applies Ibid for consecutive identical case and pinpoint", () => {
  const notes = [
    {
      type: "case",
      caseName: "Case A",
      year: "2023",
      court: "SGHC",
      caseNo: "9",
      paraStart: "12",
      paraEnd: "",
      shortName: "",
      reportCitation: "",
    },
    {
      type: "case",
      caseName: "Case A",
      year: "2023",
      court: "SGHC",
      caseNo: "9",
      paraStart: "12",
      paraEnd: "",
      shortName: "",
      reportCitation: "",
    },
  ];

  const output = computeCitationOutputs(notes);
  assert.equal(output[1].text, "Ibid.");
});

test("applies Id for consecutive same case with different pinpoint", () => {
  const notes = [
    {
      type: "case",
      caseName: "Case A",
      year: "2023",
      court: "SGHC",
      caseNo: "9",
      paraStart: "12",
      paraEnd: "",
      shortName: "",
      reportCitation: "",
    },
    {
      type: "case",
      caseName: "Case A",
      year: "2023",
      court: "SGHC",
      caseNo: "9",
      paraStart: "14",
      paraEnd: "",
      shortName: "",
      reportCitation: "",
    },
  ];

  const output = computeCitationOutputs(notes);
  assert.equal(output[1].text, "Id, at [14].");
});

test("applies supra for non-consecutive reference to same case", () => {
  const notes = [
    {
      type: "case",
      caseName: "Case A",
      shortName: "Case A",
      year: "2023",
      court: "SGCA",
      caseNo: "5",
      paraStart: "1",
      paraEnd: "",
      reportCitation: "",
    },
    {
      type: "text",
      text: "Some statute reference",
    },
    {
      type: "case",
      caseName: "Case A",
      shortName: "Case A",
      year: "2023",
      court: "SGCA",
      caseNo: "5",
      paraStart: "9",
      paraEnd: "",
      reportCitation: "",
    },
  ];

  const output = computeCitationOutputs(notes);
  assert.equal(output[2].text, "Case A, supra n 1, at [9].");
});

test("manual text citations are normalized with a single trailing period", () => {
  const notes = [
    {
      type: "text",
      text: "See s 9 of the Penal Code...",
    },
  ];

  const output = computeCitationOutputs(notes);
  assert.equal(output[0].text, "See s 9 of the Penal Code.");
});
