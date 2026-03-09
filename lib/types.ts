export interface CaseFootnote {
  id: string;
  type: 'case';
  source?: 'elitigation' | 'manual';
  caseName: string;
  shortName: string;
  reportCitation: string;
  year: string;
  court: string;
  caseNo: string;
  paraStart: string;
  paraEnd: string;
}

export interface TextFootnote {
  id: string;
  type: 'text';
  text: string;
}

export type Footnote = CaseFootnote | TextFootnote;

export interface CitationOutput {
  html: string;
  text: string;
}
