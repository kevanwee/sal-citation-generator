export type SourceType =
  "case" | "legislation" | "book" | "chapter" | "journal" | "website" | "text";
export interface Footnote {
  id: string;
  sourceId: string;
  type: SourceType;
  fields: Record<string, string>;
}
export interface CitationOutput {
  html: string;
  text: string;
  kind: "full" | "ibid" | "id" | "supra" | "manual";
  issues: string[];
}
export interface Workspace {
  version: 3;
  title: string;
  startNumber: number;
  footnotes: Footnote[];
}
