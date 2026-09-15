import type { CitationOutput, Footnote } from "./types";
import { fields } from "./schema";
export const clean = (value: string | undefined) =>
  (value || "").trim().replace(/\s+/g, " ");
export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const em = (s: string) => `<i>${escapeHtml(s)}</i>`;
const end = (s: string) => (!s ? "" : /[.!?…][”"']?$/.test(s) ? s : `${s}.`);
const normNumber = (s: string) => s.replace(/^0+(?=\d)/, "");
const strip = (s: string) => clean(s).replace(/^\[|\]$/g, "");
export interface ParsedElitigation {
  year: string;
  court: string;
  caseNo: string;
}
export function parseElitigationUrl(value: string): ParsedElitigation | null {
  try {
    let input = decodeURIComponent(value.trim());
    if (/^https?:\/\//i.test(input)) {
      const url = new URL(input);
      if (
        !["www.elitigation.sg", "elitigation.sg"].includes(url.hostname) ||
        url.username ||
        url.password ||
        url.port
      )
        return null;
      input = url.pathname
        .replace(/\/$/, "")
        .replace(/^\/gd\/(?:s|gd)\//, "")
        .replace(/\/pdf$/, "");
    }
    const match = input.match(
      /^(?:\[(\d{4})\]\s+(SG[A-Z]+)\s+(\d+)|(\d{4})_(SG[A-Z]+)_(\d+))$/i,
    );
    if (!match) return null;
    const [, y, c, n, y2, c2, n2] = match;
    if (Number(n || n2) < 1) return null;
    return {
      year: y || y2,
      court: (c || c2).toUpperCase(),
      caseNo: normNumber(n || n2),
    };
  } catch {
    return null;
  }
}
export function pinpoint(note: Footnote): string {
  const f = note.fields;
  if (note.type === "legislation") return clean(f.provision);
  const start = strip(f.pinpoint),
    finish = strip(f.pinpointEnd);
  const range = finish && finish !== start;
  if (!start)
    return note.type === "case" && clean(f.page) ? `at ${clean(f.page)}` : "";
  if (note.type === "case")
    return `at ${clean(f.page) ? `${clean(f.page)}, ` : ""}[${start}]${range ? `–[${finish}]` : ""}`;
  const numbers = start + (range ? `–${finish}` : "");
  if (f.pinpointType === "paragraph")
    return `at ${range ? "paras" : "para"} ${numbers}`;
  return `at ${note.type === "journal" ? "" : range ? "pp " : "p "}${numbers}`;
}
export function validateFootnote(note: Footnote): string[] {
  const f = note.fields,
    issues: string[] = [];
  for (const field of fields[note.type])
    if (field.required && !clean(f[field.key]))
      issues.push(`${field.label} is required.`);
  if (
    note.type === "case" &&
    !clean(f.reportCitation) &&
    !/^\d{4}\|SG[A-Z]+\|[1-9]\d*$/.test(
      `${clean(f.year)}|${clean(f.court).toUpperCase()}|${normNumber(clean(f.caseNo))}`,
    )
  )
    issues.push(
      "Enter a report citation or a complete Singapore neutral citation.",
    );
  if (
    ["book", "chapter", "journal"].includes(note.type) &&
    clean(f.year) &&
    !/^\d{4}(?:[–-]\d{2,4})?$/.test(clean(f.year))
  )
    issues.push("Use a four-digit publication year or year range.");
  if (note.type === "website" && f.url) {
    try {
      if (!["http:", "https:"].includes(new URL(f.url).protocol)) throw Error();
    } catch {
      issues.push("Use a complete http or https source URL.");
    }
  }
  if (f.pinpointEnd && !f.pinpoint)
    issues.push("Enter a pinpoint start before an end.");
  if (note.type === "case")
    for (const key of ["pinpoint", "pinpointEnd"])
      if (f[key] && !/^[1-9]\d*$/.test(strip(f[key])))
        issues.push("Case paragraphs must be positive whole numbers.");
  if (
    /^\d+$/.test(strip(f.pinpoint)) &&
    /^\d+$/.test(strip(f.pinpointEnd)) &&
    Number(strip(f.pinpointEnd)) < Number(strip(f.pinpoint))
  )
    issues.push("The pinpoint end must not precede the start.");
  return [...new Set(issues)];
}
function identity(note: Footnote): string {
  const f = note.fields;
  if (note.type === "text" || validateFootnote(note).length) return "";
  if (note.type === "case")
    return clean(f.reportCitation)
      ? `case:report:${clean(f.reportCitation).toLowerCase()}`
      : `case:neutral:${f.year}|${clean(f.court).toUpperCase()}|${normNumber(f.caseNo)}`;
  const excluded = new Set([
    "shortName",
    "shortAuthor",
    "pinpoint",
    "pinpointEnd",
    "pinpointType",
    "provision",
    "accessed",
  ]);
  return `${note.type}:${JSON.stringify(
    Object.entries(f)
      .filter(([key]) => !excluded.has(key))
      .sort()
      .map(([k, v]) => [k, clean(v).toLowerCase()]),
  )}`;
}
function full(note: Footnote): { text: string; html: string } {
  const f = Object.fromEntries(
    Object.entries(note.fields).map(([k, v]) => [k, clean(v)]),
  );
  const p = pinpoint(note);
  let text = "",
    html = "";
  const publication = [f.publisher, f.edition, f.year]
    .filter(Boolean)
    .join(", ");
  const authored = f.author ? `${f.author}, ` : "";
  if (note.type === "case") {
    const cite =
      f.reportCitation ||
      (f.year && f.court && f.caseNo
        ? `[${f.year}] ${f.court.toUpperCase()} ${normNumber(f.caseNo)}`
        : "");
    const alias = f.shortName ? ` (“${f.shortName}”)` : "";
    text = [f.caseName, cite].filter(Boolean).join(" ") + alias;
    html =
      [f.caseName ? em(f.caseName) : "", escapeHtml(cite)]
        .filter(Boolean)
        .join(" ") + (f.shortName ? ` (“${em(f.shortName)}”)` : "");
  } else if (note.type === "legislation") {
    text = `${f.title}${f.reference ? ` (${f.reference.replace(/^\(|\)$/g, "")})` : ""}${f.shortName ? ` (“${f.shortName}”)` : ""}`;
    html = escapeHtml(text);
  } else if (note.type === "book") {
    const suffix = `${f.editor ? ` (${f.editor})` : ""}${f.volume ? ` vol ${f.volume}` : ""} (${publication})`;
    text = authored + f.title + suffix;
    html = escapeHtml(authored) + em(f.title) + escapeHtml(suffix);
  } else if (note.type === "chapter") {
    const prefix = `${authored}“${f.title}” in `;
    const suffix = `${f.editor ? ` (${f.editor})` : ""} (${publication})${f.chapter ? ` ch ${f.chapter}` : ""}`;
    text = prefix + f.bookTitle + suffix;
    html = escapeHtml(prefix) + em(f.bookTitle) + escapeHtml(suffix);
  } else if (note.type === "journal") {
    const year =
      f.yearStyle === "Square (year-based)" ? `[${f.year}]` : `(${f.year})`;
    text = `${authored}“${f.title}” ${[year, f.volume, f.journal, f.firstPage].filter(Boolean).join(" ")}`;
    html = escapeHtml(text);
  } else if (note.type === "website") {
    text = `${authored}“${f.title}”${f.publication ? `, ${f.publication}` : ""}${f.date ? ` (${f.date})` : ""} <${f.url}> (accessed ${f.accessed})`;
    html = escapeHtml(text);
  } else {
    return { text: end(f.text), html: escapeHtml(end(f.text)) };
  }
  return {
    text: end(text + (p ? ` ${p}` : "")),
    html: end(html + (p ? ` ${escapeHtml(p)}` : "")),
  };
}
export function computeCitationOutputs(
  notes: Footnote[],
  startNumber = 1,
): CitationOutput[] {
  const first = new Map<string, number>();
  const keys = notes.map(identity);
  return notes.map((note, i) => {
    const issues = validateFootnote(note),
      key = keys[i],
      original = first.get(key);
    const base = {
      issues,
      ...full(note),
      kind: note.type === "text" ? ("manual" as const) : ("full" as const),
    };
    if (!key) return base;
    if (original === undefined) {
      first.set(key, i);
      return base;
    }
    const p = pinpoint(note);
    if (i > 0 && key === keys[i - 1]) {
      if (p === pinpoint(notes[i - 1]))
        return { text: "Ibid.", html: "<i>Ibid</i>.", kind: "ibid", issues };
      if (!p) return base;
      return {
        text: `Id, ${p}.`,
        html: `<i>Id</i>, ${escapeHtml(p)}.`,
        kind: "id",
        issues,
      };
    }
    const f = notes[original].fields;
    let name: string, nameHtml: string;
    if (note.type === "case" || note.type === "legislation") {
      name =
        clean(f.shortName) ||
        clean(note.type === "case" ? f.caseName : f.title);
      nameHtml = note.type === "case" ? em(name) : escapeHtml(name);
    } else {
      const author = clean(f.shortAuthor) || clean(f.author);
      const prefix = author ? `${author}, ` : "";
      const title = clean(f.shortName) || clean(f.title);
      name = `${prefix}${note.type === "book" ? title : `“${title}”`}`;
      nameHtml =
        escapeHtml(prefix) +
        (note.type === "book" ? em(title) : escapeHtml(`“${title}”`));
    }
    const suffix = ` n ${original + startNumber}${p ? `, ${p}` : ""}.`;
    return {
      text: `${name}, supra${suffix}`,
      html: `${nameHtml}, <i>supra</i>${escapeHtml(suffix)}`,
      kind: "supra",
      issues,
    };
  });
}
