import type { CitationOutput } from './types';

const DEFAULT_PINPOINT_SEPARATOR = '-';

function normalizeString(value: unknown): string {
  return String(value ?? '').trim();
}

function stripOuterBrackets(value: unknown): string {
  return normalizeString(value).replace(/^\[/, '').replace(/\]$/, '');
}

function escapeHtml(value: unknown): string {
  return normalizeString(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function hasValue(value: unknown): boolean {
  return normalizeString(value).length > 0;
}

function normalizeTextCitation(text: unknown): string {
  return normalizeString(text).replace(/[.]+$/g, '');
}

function normalizeCaseNumber(caseNo: unknown): string {
  const normalized = normalizeString(caseNo);
  if (!/^\d+$/.test(normalized)) {
    return normalized;
  }
  return String(Number(normalized));
}

interface CaseNote {
  id?: string;
  type: 'case';
  source?: string;
  caseName: string;
  shortName: string;
  reportCitation: string;
  year: string;
  court: string;
  caseNo: string;
  paraStart: string;
  paraEnd: string;
}

interface TextNote {
  id?: string;
  type: 'text';
  text: string;
}

type Note = CaseNote | TextNote;

function normalizeCaseIdentity(note: Note | null | undefined): string {
  if (!note || note.type !== 'case') {
    return '';
  }
  const cn = note as CaseNote;

  const reportCitation = normalizeString(cn.reportCitation).toLowerCase();
  if (reportCitation) {
    return `report:${reportCitation}`;
  }

  const year = normalizeString(cn.year);
  const court = normalizeString(cn.court).toUpperCase();
  const caseNo = normalizeCaseNumber(cn.caseNo);
  if (year && court && caseNo) {
    return `neutral:${year}|${court}|${caseNo}`;
  }

  return `name:${normalizeString(cn.caseName).toLowerCase()}`;
}

function getPinpointParts(note: Note | null | undefined): { start: string; end: string } {
  if (!note || note.type !== 'case') return { start: '', end: '' };
  const cn = note as CaseNote;
  return {
    start: stripOuterBrackets(cn.paraStart),
    end: stripOuterBrackets(cn.paraEnd),
  };
}

function isSameCase(left: Note, right: Note): boolean {
  const id = normalizeCaseIdentity(left);
  return Boolean(id && id === normalizeCaseIdentity(right));
}

function isSamePinpoint(left: Note, right: Note): boolean {
  const lp = getPinpointParts(left);
  const rp = getPinpointParts(right);
  return lp.start === rp.start && lp.end === rp.end;
}

function resolvePinpoint(note: Note, separator = DEFAULT_PINPOINT_SEPARATOR): string {
  const { start, end } = getPinpointParts(note);
  if (!start) return '';
  if (end && end !== start) {
    return `at [${start}]${separator}[${end}]`;
  }
  return `at [${start}]`;
}

function resolveNeutralCitation(note: CaseNote): string {
  const year = normalizeString(note.year);
  const court = normalizeString(note.court).toUpperCase();
  const caseNo = normalizeCaseNumber(note.caseNo);
  if (!year || !court || !caseNo) return '';
  return `[${year}] ${court} ${caseNo}`;
}

function resolvePrimaryCaseCitation(note: CaseNote): string {
  const reportCitation = normalizeString(note.reportCitation);
  if (reportCitation) return reportCitation;
  return resolveNeutralCitation(note);
}

function resolveShortCaseName(note: CaseNote): string {
  const shortName = normalizeString(note.shortName);
  if (shortName) return shortName;
  const caseName = normalizeString(note.caseName);
  if (caseName) return caseName;
  return resolvePrimaryCaseCitation(note);
}

function ensureTrailingPeriod(text: string): string {
  return `${normalizeString(text).replace(/[.]+$/g, '')}.`;
}

function formatTextCitation(note: { text?: string }): CitationOutput {
  const text = normalizeTextCitation(note?.text);
  return {
    html: `${escapeHtml(text)}.`,
    text: `${text}.`,
  };
}

function formatFullCaseCitation(note: CaseNote): CitationOutput {
  const caseName = normalizeString(note.caseName);
  const citation = resolvePrimaryCaseCitation(note);
  const pinpoint = resolvePinpoint(note);

  const htmlParts: string[] = [];
  const textParts: string[] = [];

  if (caseName) {
    htmlParts.push(`<span class="italic">${escapeHtml(caseName)}</span>`);
    textParts.push(caseName);
  }
  if (citation) {
    htmlParts.push(escapeHtml(citation));
    textParts.push(citation);
  }
  if (pinpoint) {
    htmlParts.push(escapeHtml(pinpoint));
    textParts.push(pinpoint);
  }

  return {
    html: ensureTrailingPeriod(htmlParts.join(' ')),
    text: ensureTrailingPeriod(textParts.join(' ')),
  };
}

function formatIbid(): CitationOutput {
  return {
    html: '<span class="italic">Ibid</span>.',
    text: 'Ibid.',
  };
}

function formatId(note: CaseNote): CitationOutput {
  const pinpoint = resolvePinpoint(note);
  if (!pinpoint) {
    return { html: '<span class="italic">Id</span>.', text: 'Id.' };
  }
  return {
    html: `<span class="italic">Id</span>, ${escapeHtml(pinpoint)}.`,
    text: `Id, ${pinpoint}.`,
  };
}

function formatSupra(note: CaseNote, firstIndex: number): CitationOutput {
  const shortName = resolveShortCaseName(note);
  const pinpoint = resolvePinpoint(note);
  const suffix = pinpoint ? `, ${pinpoint}` : '';
  return {
    html: `${escapeHtml(shortName)}, <span class="italic">supra</span> n ${firstIndex + 1}${escapeHtml(suffix)}.`,
    text: `${shortName}, supra n ${firstIndex + 1}${suffix}.`,
  };
}

export interface ParsedElitigation {
  year: string;
  court: string;
  caseNo: string;
}

export function parseElitigationUrl(url: string): ParsedElitigation | null {
  const input = normalizeString(url);
  if (!input) return null;

  const decoded = decodeURIComponent(input);
  const match = decoded.match(/(\d{4})_(SG[A-Z]+)_(\d+)/i);
  if (!match) return null;

  return {
    year: match[1],
    court: match[2].toUpperCase(),
    caseNo: normalizeCaseNumber(match[3]),
  };
}

export function computeCitationOutputs(footnotes: Note[]): CitationOutput[] {
  const items = Array.isArray(footnotes) ? footnotes : [];
  const outputs = new Array<CitationOutput>(items.length);
  const firstCaseReference = new Map<string, number>();

  items.forEach((note, index) => {
    if (note?.type !== 'case') return;
    const key = normalizeCaseIdentity(note);
    if (key && !firstCaseReference.has(key)) {
      firstCaseReference.set(key, index);
    }
  });

  items.forEach((note, index) => {
    if (!note || note.type === 'text') {
      outputs[index] = formatTextCitation((note as TextNote) ?? { text: '' });
      return;
    }

    if (note.type !== 'case') {
      outputs[index] = formatTextCitation({ text: '' });
      return;
    }

    const cn = note as CaseNote;
    const previous = items[index - 1];

    if (index > 0 && previous?.type === 'case' && isSameCase(note, previous)) {
      outputs[index] = isSamePinpoint(note, previous) ? formatIbid() : formatId(cn);
      return;
    }

    const firstIndex = firstCaseReference.get(normalizeCaseIdentity(note));
    if (typeof firstIndex === 'number' && firstIndex < index) {
      outputs[index] = formatSupra(cn, firstIndex);
      return;
    }

    outputs[index] = formatFullCaseCitation(cn);
  });

  return outputs;
}

export function createCaseFootnoteFromElitigation(
  parsed: ParsedElitigation,
): Omit<CaseNote, 'id'> {
  return {
    type: 'case',
    source: 'elitigation',
    caseName: '',
    shortName: '',
    reportCitation: '',
    year: normalizeString(parsed?.year),
    court: normalizeString(parsed?.court).toUpperCase(),
    caseNo: normalizeCaseNumber(parsed?.caseNo),
    paraStart: '',
    paraEnd: '',
  };
}

export function createTextFootnote(text: string): Omit<TextNote, 'id'> {
  return {
    type: 'text',
    text: normalizeString(text),
  };
}
