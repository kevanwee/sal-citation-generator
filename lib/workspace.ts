import { createFootnote, fields, sourceTypes } from "./schema";
import type { Footnote, Workspace, SourceType } from "./types";

export const STORAGE_KEY = "sal-citation-generator:v3";
export const LEGACY_KEY = "sal-citation-generator:v2";
export const emptyWorkspace = (): Workspace => ({
  version: 3,
  title: "Untitled manuscript",
  startNumber: 1,
  footnotes: [],
});
const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export function parseWorkspace(raw: string): Workspace {
  if (raw.length > 5_000_000)
    throw Error("This backup exceeds the 5 MB limit.");
  const data: unknown = JSON.parse(raw);
  if (Array.isArray(data)) {
    if (data.length > 2000)
      throw Error("The workspace limit is 2,000 footnotes.");
    const footnotes = data.map((item): Footnote => {
      if (!isRecord(item) || !["case", "text"].includes(String(item.type)))
        throw Error("The old workspace contains an invalid footnote.");
      const note = createFootnote(item.type as SourceType);
      for (const f of fields[note.type]) {
        if (item[f.key] !== undefined && typeof item[f.key] !== "string")
          throw Error("Invalid legacy field.");
        note.fields[f.key] = String(item[f.key] ?? "");
      }
      for (const key of ["paraStart", "paraEnd"])
        if (item[key] !== undefined && typeof item[key] !== "string")
          throw Error("Invalid legacy pinpoint.");
      note.fields.pinpoint = String(item.paraStart ?? "");
      note.fields.pinpointEnd = String(item.paraEnd ?? "");
      return note;
    });
    return { ...emptyWorkspace(), footnotes };
  }
  if (
    !isRecord(data) ||
    data.version !== 3 ||
    typeof data.title !== "string" ||
    data.title.length > 200 ||
    !Number.isInteger(data.startNumber) ||
    Number(data.startNumber) < 1 ||
    Number(data.startNumber) > 99999 ||
    !Array.isArray(data.footnotes) ||
    data.footnotes.length > 2000
  )
    throw Error("This is not a supported SAL workspace backup.");
  const ids = new Set<string>();
  const footnotes = data.footnotes.map((item): Footnote => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !item.id ||
      item.id.length > 100 ||
      ids.has(item.id) ||
      typeof item.sourceId !== "string" ||
      !item.sourceId ||
      item.sourceId.length > 100 ||
      !sourceTypes.some((s) => s.type === item.type) ||
      !isRecord(item.fields)
    )
      throw Error("The backup contains an invalid or duplicate footnote.");
    ids.add(item.id);
    const result = createFootnote(item.type as SourceType);
    const allowed = new Set([...Object.keys(result.fields), "sourceUrl"]);
    for (const [key, value] of Object.entries(item.fields)) {
      if (
        !allowed.has(key) ||
        typeof value !== "string" ||
        value.length > 20000
      )
        throw Error("The backup contains an invalid citation field.");
      result.fields[key] = value;
    }
    return { ...result, id: item.id, sourceId: item.sourceId };
  });
  // A linked source must keep one set of bibliographic details.
  const sources = new Map<string, string>();
  for (const note of footnotes) {
    const signature = JSON.stringify([
      note.type,
      Object.entries(note.fields)
        .filter(
          ([k]) =>
            ![
              "pinpoint",
              "pinpointEnd",
              "pinpointType",
              "page",
              "provision",
            ].includes(k),
        )
        .sort(),
    ]);
    if (sources.has(note.sourceId) && sources.get(note.sourceId) !== signature)
      throw Error("Linked source details conflict in this backup.");
    sources.set(note.sourceId, signature);
  }
  return {
    version: 3,
    title: data.title,
    startNumber: Number(data.startNumber),
    footnotes,
  };
}
export function updateFootnote(
  notes: Footnote[],
  updated: Footnote,
): Footnote[] {
  const localKeys = [
    "pinpoint",
    "pinpointEnd",
    "pinpointType",
    "page",
    "provision",
  ];
  return notes.map((note) => {
    if (note.id === updated.id) return updated;
    if (note.sourceId !== updated.sourceId) return note;
    return {
      ...note,
      fields: {
        ...updated.fields,
        ...Object.fromEntries(
          localKeys
            .filter((k) => k in note.fields)
            .map((k) => [k, note.fields[k]]),
        ),
      },
    };
  });
}
