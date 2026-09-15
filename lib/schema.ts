import type { SourceType, Footnote } from "./types";
export interface Field {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  options?: string[];
}
const field = (
  key: string,
  label: string,
  placeholder = "",
  required = false,
  hint?: string,
): Field => ({ key, label, placeholder, required, hint });
const author = field(
  "author",
  "Author(s)",
  "Colin Tapper",
  true,
  "Use names as published; separate the final two authors with &.",
);
const title = field("title", "Title", "", true);
const year = field("year", "Publication year", "1999", true);
const publisher = field("publisher", "Publisher", "Butterworths", true);
const edition = field(
  "edition",
  "Edition",
  "9th Ed",
  false,
  "Omit for the first edition.",
);
const short = field(
  "shortName",
  "Short reference",
  "",
  false,
  "An abbreviated name to use in later references.",
);
const shortTitle = field(
  "shortName",
  "Short title",
  "",
  false,
  "An optional abbreviated title for later references.",
);
const shortAuthor = field(
  "shortAuthor",
  "Author short form",
  "",
  false,
  "Author surname(s) for later references. Full names are retained if omitted.",
);
export const sourceTypes: {
  type: SourceType;
  label: string;
  mark: string;
  rule: string;
}[] = [
  { type: "case", label: "Case", mark: "01", rule: "SAL C–1; D–3" },
  {
    type: "legislation",
    label: "Legislation",
    mark: "02",
    rule: "SAL C–2–C–3",
  },
  { type: "book", label: "Book", mark: "03", rule: "SAL C–5" },
  { type: "chapter", label: "Book chapter", mark: "04", rule: "SAL C–6" },
  { type: "journal", label: "Journal article", mark: "05", rule: "SAL C–6" },
  { type: "website", label: "Website", mark: "06", rule: "SAL C–8" },
  { type: "text", label: "Free text", mark: "07", rule: "Manually formatted" },
];
export const fields: Record<SourceType, Field[]> = {
  case: [
    field("caseName", "Case name", "Tan Kim Seng v Victor Adam Ibrahim", true),
    short,
    field(
      "reportCitation",
      "Report citation",
      "[2002] 3 SLR 345",
      false,
      "Preferred when reported. Enter the complete citation from the report.",
    ),
    field("year", "Judgment year", "2003"),
    field("court", "Court", "SGCA"),
    field("caseNo", "Decision number", "49"),
    field(
      "page",
      "Historical report page",
      "460",
      false,
      "For an older report requiring both a page and a paragraph.",
    ),
  ],
  legislation: [
    field("title", "Legislation title", "Misuse of Drugs Act", true),
    field(
      "reference",
      "Edition / instrument reference",
      "Cap 185, 2001 Rev Ed",
      true,
      "Copy the version actually cited, without outer parentheses. Also accepts Act or GN references.",
    ),
    short,
    field(
      "provision",
      "Provision",
      "s 2(1)",
      false,
      "Include the label: s, ss, Art, reg, O or r, as appropriate.",
    ),
  ],
  book: [
    { ...author, required: false },
    title,
    field("editor", "Editor / translator", "A G Guest gen ed"),
    publisher,
    edition,
    year,
    field("volume", "Volume", "5"),
    shortAuthor,
    shortTitle,
  ],
  chapter: [
    author,
    field(
      "title",
      "Chapter title",
      "The Applicability of English Law in Singapore",
      true,
    ),
    field("bookTitle", "Book title", "The Singapore Legal System", true),
    field("editor", "Editor", "Kevin Y L Tan ed", true),
    publisher,
    edition,
    year,
    field("chapter", "Chapter number", "6"),
    shortAuthor,
    shortTitle,
  ],
  journal: [
    author,
    field(
      "title",
      "Article title",
      "No Consideration: Restitution After Void Contracts",
      true,
    ),
    year,
    {
      key: "yearStyle",
      label: "Year brackets",
      options: ["Round (volume-based)", "Square (year-based)"],
    },
    field("volume", "Volume / issue", "23"),
    field("journal", "Journal abbreviation", "UWALR", true),
    field("firstPage", "First page", "195", true),
    shortAuthor,
    shortTitle,
  ],
  website: [
    field("author", "Author / institution", "National Heritage Board"),
    title,
    field("publication", "Publication / website name"),
    field("date", "Publication date", "4 July 2003"),
    field("url", "Source URL", "https://example.org/article", true),
    field("accessed", "Access date", "23 April 2004", true),
    shortAuthor,
    shortTitle,
  ],
  text: [
    field(
      "text",
      "Citation text",
      "Enter your complete footnote, including any compound references.",
      true,
    ),
  ],
};
export function createFootnote(type: SourceType): Footnote {
  const id = crypto.randomUUID();
  return {
    id,
    sourceId: id,
    type,
    fields: {
      ...Object.fromEntries(fields[type].map((f) => [f.key, ""])),
      pinpointType: type === "case" ? "paragraph" : "page",
      pinpoint: "",
      pinpointEnd: "",
      yearStyle: "Round (volume-based)",
    },
  };
}
