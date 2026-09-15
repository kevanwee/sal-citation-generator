"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  computeCitationOutputs,
  parseElitigationUrl,
  validateFootnote,
} from "@/lib/citationEngine";
import { createFootnote, fields, sourceTypes } from "@/lib/schema";
import {
  emptyWorkspace,
  LEGACY_KEY,
  parseWorkspace,
  STORAGE_KEY,
  updateFootnote,
} from "@/lib/workspace";
import {
  copyCitations,
  downloadFile,
  exportHtml,
  exportText,
} from "@/lib/export";
import type {
  CitationOutput,
  Footnote,
  SourceType,
  Workspace,
} from "@/lib/types";

export default function CitationManager() {
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState("Loading workspace…");
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [recovery, setRecovery] = useState("");
  const [status, setStatus] = useState("");
  const [history, setHistory] = useState<Workspace[]>([]);
  const [draft, setDraft] = useState<Footnote>(() => ({
    id: "draft",
    sourceId: "draft",
    type: "case",
    fields: {},
  }));
  const [editing, setEditing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lookupInput, setLookupInput] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupMessage, setLookupMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLHeadingElement>(null);
  const lookupSequence = useRef(0);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      scrollBehavior: "auto",
    }),
  );
  const outputs = useMemo(
    () => computeCitationOutputs(workspace.footnotes, workspace.startNumber),
    [workspace],
  );
  const invalid = outputs.filter((o) => o.issues.length).length;
  const draftOutput = useMemo(
    () => computeCitationOutputs([draft])[0],
    [draft],
  );
  const source = sourceTypes.find((s) => s.type === draft.type)!;

  useEffect(() => {
    setDraft(createFootnote("case"));
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
      if (raw) {
        try {
          setWorkspace(parseWorkspace(raw));
        } catch {
          setRecovery(raw);
          setStorageBlocked(true);
          setStatus(
            "Saved data could not be opened. Download the original below, or import a valid backup. The original has been preserved.",
          );
        }
      }
    } catch {
      setStorageBlocked(true);
      setStatus(
        "Browser storage is unavailable. You can keep working and download a backup.",
      );
    }
    setReady(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setStorageBlocked(true);
        setStatus(
          "This workspace changed in another tab. Automatic saving is paused. Back up your changes before reloading to use the other tab’s version.",
        );
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  useEffect(() => {
    if (!ready) return;
    if (storageBlocked) {
      setSaveState("Not saved · download a backup");
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
      setSaveState("Saved in this browser");
    } catch {
      setStorageBlocked(true);
      setSaveState("Not saved · download a backup");
      setStatus(
        "The browser could not save your workspace. Download a backup to protect your work.",
      );
    }
  }, [workspace, ready, storageBlocked]);

  function change(next: Workspace) {
    setHistory((h) => [...h.slice(-29), workspace]);
    setWorkspace(next);
  }
  function fresh(type: SourceType, focus = false) {
    lookupSequence.current++;
    setLookupBusy(false);
    setDraft(createFootnote(type));
    setEditing(false);
    setSubmitted(false);
    setLookupMessage("");
    setLookupInput("");
    if (focus) setTimeout(() => editorRef.current?.focus(), 0);
  }
  function updateField(key: string, value: string) {
    setDraft((d) => ({ ...d, fields: { ...d.fields, [key]: value } }));
  }
  function submit() {
    setSubmitted(true);
    if (validateFootnote(draft).length) {
      setStatus("Complete the required source details before saving.");
      return;
    }
    if (!editing && workspace.footnotes.length >= 2000) {
      setStatus(
        "This workspace has reached 2,000 footnotes. Start a new manuscript after saving a backup.",
      );
      return;
    }
    change({
      ...workspace,
      footnotes: updateFootnote(
        editing ? workspace.footnotes : [...workspace.footnotes, draft],
        draft,
      ),
    });
    setStatus(
      editing
        ? "Source updated. Linked references have been recalculated."
        : `Footnote ${workspace.startNumber + workspace.footnotes.length} added.`,
    );
    fresh(draft.type);
  }
  function edit(note: Footnote) {
    lookupSequence.current++;
    setLookupBusy(false);
    setDraft({ ...note, fields: { ...note.fields } });
    setEditing(true);
    setSubmitted(false);
    setLookupMessage("");
    setTimeout(() => editorRef.current?.focus(), 0);
  }
  function repeat(note: Footnote) {
    edit({ ...note, id: crypto.randomUUID() });
    setEditing(false);
    setStatus(
      "Reusing this source. Adjust the pinpoint, then add the footnote. Source details remain linked.",
    );
  }
  function remove(id: string) {
    change({
      ...workspace,
      footnotes: workspace.footnotes.filter((n) => n.id !== id),
    });
    if (draft.id === id) fresh(draft.type);
    setStatus("Footnote removed. Undo is available.");
  }
  function move(index: number, destination: number) {
    if (destination < 0 || destination >= workspace.footnotes.length) return;
    change({
      ...workspace,
      footnotes: arrayMove(workspace.footnotes, index, destination),
    });
    setStatus("Footnotes reordered. Cross-references updated.");
  }
  function dragEnd(event: DragEndEvent) {
    if (event.over && event.active.id !== event.over.id)
      move(
        workspace.footnotes.findIndex((n) => n.id === event.active.id),
        workspace.footnotes.findIndex((n) => n.id === event.over!.id),
      );
  }
  function undo() {
    const previous = history.at(-1);
    if (previous) {
      setWorkspace(previous);
      setHistory((h) => h.slice(0, -1));
      fresh(draft.type);
      setStatus("Last workspace change undone.");
    }
  }
  async function lookup() {
    const parsed = parseElitigationUrl(lookupInput);
    if (!parsed) {
      setLookupMessage(
        "Use an eLitigation URL or a citation such as [2023] SGCA 5.",
      );
      return;
    }
    const sequence = ++lookupSequence.current;
    setDraft((d) => ({ ...d, fields: { ...d.fields, ...parsed } }));
    setLookupBusy(true);
    setLookupMessage("Retrieving the judgment header…");
    try {
      const response = await fetch(
        `/api/elitigation?citation=${encodeURIComponent(`${parsed.year}_${parsed.court}_${parsed.caseNo}`)}`,
        { signal: AbortSignal.timeout(15000) },
      );
      const data = await response.json();
      if (sequence !== lookupSequence.current) return;
      if (!response.ok)
        throw Error(
          data.error || "Lookup unavailable. Enter the case name manually.",
        );
      setDraft((d) => ({
        ...d,
        fields: {
          ...d.fields,
          caseName: data.caseName,
          sourceUrl: data.sourceUrl,
        },
      }));
      setLookupMessage(
        "Case name retrieved. Check the source and add an SLR citation if reported.",
      );
    } catch (error) {
      if (sequence === lookupSequence.current)
        setLookupMessage(
          error instanceof Error
            ? error.message
            : "Lookup unavailable. Enter details manually.",
        );
    } finally {
      if (sequence === lookupSequence.current) setLookupBusy(false);
    }
  }
  async function copy(index?: number) {
    const selected = index === undefined ? outputs : [outputs[index]];
    try {
      const kind = await copyCitations(
        selected,
        index === undefined
          ? workspace.startNumber
          : workspace.startNumber + index,
        index === undefined,
      );
      setStatus(
        kind === "rich"
          ? "Copied with italics. Paste into your document."
          : "Copied as plain text. Use HTML export to retain italics.",
      );
    } catch {
      setStatus(
        "Clipboard access was blocked. Use the text or HTML download instead.",
      );
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5_000_000)
        throw Error("Choose a backup smaller than 5 MB.");
      const imported = parseWorkspace(await file.text());
      change(imported);
      fresh("case");
      setStatus("Backup imported. Undo restores the previous workspace.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not read this backup.",
      );
    }
    if (importRef.current) importRef.current.value = "";
  }
  function example() {
    const a = createFootnote("case");
    a.fields = {
      ...a.fields,
      caseName: "Tan Kim Seng v Victor Adam Ibrahim",
      shortName: "Tan Kim Seng",
      year: "2003",
      court: "SGCA",
      caseNo: "49",
      pinpoint: "10",
    };
    const b = { ...a, id: crypto.randomUUID(), fields: { ...a.fields } };
    const c = {
      ...a,
      id: crypto.randomUUID(),
      fields: { ...a.fields, pinpoint: "12" },
    };
    change({ ...workspace, footnotes: [a, b, c] });
    setStatus(
      "Example loaded from SAL C–1, with illustrative pinpoints. Edit or clear it to start your own list.",
    );
  }
  const canExport = outputs.length > 0 && invalid === 0;
  return (
    <>
      <div className="workspace-bar">
        <div className="manuscript-name">
          <span className="eyebrow">YOUR MANUSCRIPT</span>
          <label className="sr-only" htmlFor="manuscript-title">
            Manuscript title
          </label>
          <input
            id="manuscript-title"
            maxLength={200}
            value={workspace.title}
            onChange={(e) =>
              setWorkspace({ ...workspace, title: e.target.value })
            }
          />
        </div>
        <div className="workspace-actions">
          <span className={`save-status ${storageBlocked ? "unsaved" : ""}`}>
            <span aria-hidden="true">●</span> {saveState}
          </span>
          <button
            className="button subtle"
            onClick={() =>
              downloadFile(
                JSON.stringify(workspace, null, 2),
                "sal-workspace.json",
                "application/json",
              )
            }
          >
            Back up
          </button>
          <button
            className="button subtle"
            onClick={() => importRef.current?.click()}
          >
            Import
          </button>
          <input
            className="sr-only"
            type="file"
            accept=".json,application/json"
            ref={importRef}
            aria-label="Import workspace backup"
            onChange={(e) => void importFile(e.target.files?.[0])}
          />
        </div>
      </div>
      <div className="status-message" role="status" aria-live="polite">
        {status ||
          "Build your footnotes in the order they appear in your manuscript."}
      </div>
      {recovery && (
        <div className="notice">
          Your original saved data is preserved.{" "}
          <button
            className="text-button"
            onClick={() =>
              downloadFile(
                recovery,
                "sal-recovery-original.json",
                "application/json",
              )
            }
          >
            Download original data
          </button>
        </div>
      )}
      <div className="workspace-grid" aria-busy={!ready}>
        <aside className="source-nav" aria-label="Source types">
          <p className="eyebrow">ADD A SOURCE</p>
          {sourceTypes.map((s) => (
            <button
              key={s.type}
              className={`source-option ${draft.type === s.type ? "active" : ""}`}
              aria-label={s.label}
              aria-pressed={draft.type === s.type}
              onClick={() => fresh(s.type)}
              disabled={!ready || lookupBusy}
            >
              <span className="source-mark">{s.mark}</span>
              {s.label}
              <span className="source-arrow" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
          <div className="nav-note">
            <span className="small-rule" />
            <strong>Made for legal writing.</strong>
            <p>
              Source details in.
              <br />
              Consistent footnotes out.
            </p>
            <a href="#style-notes">About the citation rules ↗</a>
          </div>
        </aside>
        <section className="editor-panel" aria-labelledby="editor-heading">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                {editing ? "EDIT SOURCE" : "SOURCE DETAILS"}
              </p>
              <h2 id="editor-heading" ref={editorRef} tabIndex={-1}>
                {editing ? "Edit " : ""}
                {source.label}
              </h2>
            </div>
            <span className="rule-chip">{source.rule}</span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            noValidate
          >
            {draft.type === "case" && (
              <div className="lookup-box">
                <label htmlFor="case-lookup">
                  Start with a citation or URL
                </label>
                <div className="lookup-row">
                  <input
                    id="case-lookup"
                    value={lookupInput}
                    onChange={(e) => setLookupInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void lookup();
                      }
                    }}
                    placeholder="[2023] SGCA 5 or eLitigation URL"
                  />
                  <button
                    className="button dark"
                    type="button"
                    disabled={lookupBusy || !ready}
                    onClick={() => void lookup()}
                  >
                    {lookupBusy ? "Looking up…" : "Look up"}
                  </button>
                </div>
                <p>
                  Retrieves the case name from eLitigation. You can also enter
                  all details below.
                </p>
                <p role="status">{lookupMessage}</p>
                {draft.fields.sourceUrl &&
                  /^https:\/\/www\.elitigation\.sg\/gd\/s\/\d{4}_SG[A-Z]+_\d+$/.test(
                    draft.fields.sourceUrl,
                  ) && (
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={draft.fields.sourceUrl}
                    >
                      Open judgment ↗
                    </a>
                  )}
              </div>
            )}
            <p className="form-note">
              Fields marked <span aria-hidden="true">*</span> are required.
            </p>
            <fieldset disabled={!ready || lookupBusy} className="fields-grid">
              <legend className="sr-only">{source.label} details</legend>
              {fields[draft.type].map((f) => (
                <label
                  key={f.key}
                  className={`field ${["caseName", "shortName", "title", "bookTitle", "text", "reportCitation", "reference", "url", "author"].includes(f.key) ? "wide" : ""}`}
                >
                  <span>
                    {f.label}
                    {f.required && <span className="required"> *</span>}
                  </span>
                  {f.options ? (
                    <select
                      aria-label={f.label}
                      value={draft.fields[f.key] || f.options[0]}
                      onChange={(e) => updateField(f.key, e.target.value)}
                    >
                      {f.options.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : f.key === "text" ? (
                    <textarea
                      aria-label={f.label}
                      rows={5}
                      value={draft.fields[f.key] || ""}
                      onChange={(e) => updateField(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      required={f.required}
                      maxLength={20000}
                    />
                  ) : (
                    <input
                      aria-label={f.label}
                      value={draft.fields[f.key] || ""}
                      onChange={(e) => updateField(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      required={f.required}
                      maxLength={20000}
                      aria-invalid={
                        submitted && f.required && !draft.fields[f.key]?.trim()
                          ? true
                          : undefined
                      }
                    />
                  )}{" "}
                  {f.hint && <small>{f.hint}</small>}
                </label>
              ))}
            </fieldset>
            {!["legislation", "text", "website"].includes(draft.type) && (
              <fieldset
                className="pinpoint-fields"
                disabled={!ready || lookupBusy}
              >
                <legend>
                  Pinpoint <span>optional</span>
                </legend>
                {draft.type !== "case" && (
                  <label className="field">
                    <span>Pinpoint type</span>
                    <select
                      value={draft.fields.pinpointType || "page"}
                      onChange={(e) =>
                        updateField("pinpointType", e.target.value)
                      }
                    >
                      <option value="page">Page</option>
                      <option value="paragraph">Paragraph</option>
                    </select>
                  </label>
                )}
                <div className="fields-grid">
                  <label className="field">
                    <span>
                      {draft.type === "case" ? "Paragraph" : "Pinpoint"} start
                    </span>
                    <input
                      value={draft.fields.pinpoint || ""}
                      onChange={(e) => updateField("pinpoint", e.target.value)}
                      placeholder="e.g. 10"
                    />
                  </label>
                  <label className="field">
                    <span>End of range</span>
                    <input
                      value={draft.fields.pinpointEnd || ""}
                      onChange={(e) =>
                        updateField("pinpointEnd", e.target.value)
                      }
                      placeholder="e.g. 12"
                    />
                  </label>
                </div>
              </fieldset>
            )}
            {submitted && draftOutput.issues.length > 0 && (
              <div className="validation" role="alert">
                <strong>Check these details</strong>
                <ul>
                  {draftOutput.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="draft-preview">
              <span className="eyebrow">FULL CITATION PREVIEW</span>
              {Object.values(draft.fields).some(
                (v) =>
                  v &&
                  !["page", "paragraph", "Round (volume-based)"].includes(v),
              ) ? (
                <p
                  className="citation-text"
                  dangerouslySetInnerHTML={{ __html: draftOutput.html }}
                />
              ) : (
                <p className="preview-placeholder">
                  Your formatted citation will appear here.
                </p>
              )}
              <small>
                Repeat references are calculated in your footnote list.
              </small>
            </div>
            <div className="form-actions">
              <button
                className="button primary"
                type="submit"
                disabled={!ready || lookupBusy}
              >
                {editing ? "Save changes" : "Add footnote"}{" "}
                <span aria-hidden="true">→</span>
              </button>
              <button
                type="button"
                className="button subtle"
                onClick={() => fresh(draft.type)}
              >
                {editing ? "Cancel" : "Reset fields"}
              </button>
            </div>
          </form>
        </section>
        <section className="document-panel" aria-labelledby="footnotes-heading">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">YOUR DOCUMENT</p>
              <h2 id="footnotes-heading">
                Footnotes{" "}
                <span className="count">{workspace.footnotes.length}</span>
              </h2>
            </div>
            <button
              className="button subtle"
              disabled={!history.length}
              onClick={undo}
            >
              ↶ Undo
            </button>
          </div>
          <div className="document-toolbar">
            <div className="view-toggle" aria-label="Footnote view">
              <button
                aria-pressed={!preview}
                className={!preview ? "selected" : ""}
                onClick={() => setPreview(false)}
              >
                Arrange
              </button>
              <button
                aria-pressed={preview}
                className={preview ? "selected" : ""}
                onClick={() => setPreview(true)}
              >
                Preview
              </button>
            </div>
            <label className="start-number">
              Start at{" "}
              <input
                type="number"
                min={1}
                max={99999}
                value={workspace.startNumber}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isInteger(n) && n > 0 && n <= 99999)
                    change({ ...workspace, startNumber: n });
                }}
              />
            </label>
          </div>
          {invalid > 0 && (
            <div className="notice">
              {invalid} {invalid === 1 ? "footnote needs" : "footnotes need"}{" "}
              attention before export. Edit the flagged entries below.
            </div>
          )}
          {!workspace.footnotes.length ? (
            <div className="empty-document">
              <div className="paper-symbol" aria-hidden="true">
                <span>1</span>
                <i />
                <i />
                <i />
              </div>
              <h3>
                A considered argument
                <br />
                starts with a good source.
              </h3>
              <p>
                Add your first source on the left.
                <br />
                We’ll take care of numbering and repeat references.
              </p>
              <button
                className="text-button"
                onClick={example}
                disabled={!ready}
              >
                Try an example <span aria-hidden="true">↗</span>
              </button>
              <div className="empty-features">
                <span>
                  <i>Ibid</i> & <i>Id</i>
                </span>
                <span>
                  Automatic <i>supra</i>
                </span>
                <span>Formatted copy</span>
              </div>
            </div>
          ) : preview ? (
            <ol className="reading-preview" start={workspace.startNumber}>
              {outputs.map((o, i) => (
                <li key={workspace.footnotes[i].id}>
                  <p
                    className="citation-text"
                    dangerouslySetInnerHTML={{ __html: o.html }}
                  />
                  {o.issues.length > 0 && (
                    <small className="error-text">{o.issues.join(" ")}</small>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <DndContext
              accessibility={{
                announcements: {
                  onDragStart: ({ active }) =>
                    `Picked up footnote ${workspace.startNumber + workspace.footnotes.findIndex((n) => n.id === active.id)}. Use the arrow keys to move.`,
                  onDragOver: ({ over }) =>
                    over
                      ? `Moving over footnote ${workspace.startNumber + workspace.footnotes.findIndex((n) => n.id === over.id)}.`
                      : "Moving outside the footnote list.",
                  onDragEnd: ({ over }) =>
                    over
                      ? `Placed at footnote ${workspace.startNumber + workspace.footnotes.findIndex((n) => n.id === over.id)}.`
                      : "Reordering cancelled.",
                  onDragCancel: () => "Reordering cancelled.",
                },
              }}
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={dragEnd}
            >
              <SortableContext
                items={workspace.footnotes.map((n) => n.id)}
                strategy={verticalListSortingStrategy}
              >
                <ol className="footnote-list" start={workspace.startNumber}>
                  {workspace.footnotes.map((n, i) => (
                    <FootnoteRow
                      key={n.id}
                      note={n}
                      output={outputs[i]}
                      number={i + workspace.startNumber}
                      first={i === 0}
                      last={i === workspace.footnotes.length - 1}
                      onEdit={() => edit(n)}
                      onRepeat={() => repeat(n)}
                      onRemove={() => remove(n.id)}
                      onMove={(direction) => move(i, i + direction)}
                      onCopy={() => void copy(i)}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          )}
          <div className="export-panel">
            <div className="export-heading">
              <div>
                <strong>Ready for your manuscript</strong>
                <p>Copy keeps italics in compatible editors.</p>
              </div>
              <button
                className="button primary"
                disabled={!canExport}
                onClick={() => void copy()}
              >
                Copy all
              </button>
            </div>
            <div className="export-links">
              <button
                disabled={!canExport}
                onClick={() =>
                  downloadFile(
                    exportHtml(outputs, workspace.startNumber, workspace.title),
                    "sal-footnotes.html",
                    "text/html",
                  )
                }
              >
                Download HTML ↗
              </button>
              <button
                disabled={!canExport}
                onClick={() =>
                  downloadFile(
                    exportText(outputs, workspace.startNumber),
                    "sal-footnotes.txt",
                    "text/plain",
                  )
                }
              >
                Download text ↓
              </button>
              <button
                disabled={!workspace.footnotes.length}
                className="clear-button"
                onClick={() => {
                  change({ ...workspace, footnotes: [] });
                  fresh("case");
                  setStatus("Footnotes cleared. Undo restores the list.");
                }}
              >
                Clear list
              </button>
            </div>
          </div>
          <p className="document-note">
            One source per footnote. Use free text for compound footnotes.
          </p>
        </section>
      </div>
      <section className="style-notes" id="style-notes">
        <div>
          <p className="eyebrow">THE RULES BEHIND THE REFERENCES</p>
          <h2>
            A little precision.
            <br />A lot less repetition.
          </h2>
        </div>
        <div className="rule-explanations">
          <details>
            <summary>SAL academic footnotes</summary>
            <p>
              Based on the supplied SAL Style Guide Quick Reference, July 2007.
              The same source and pinpoint immediately repeated becomes{" "}
              <i>Ibid</i>. A changed pinpoint becomes <i>Id</i>. A later
              reference points to its first full citation using <i>supra n</i>{" "}
              (D–3.1–D–3.3). Reordering updates these references.
            </p>
          </details>
          <details>
            <summary>Reports, pinpoints and short names</summary>
            <p>
              Use the SLR report citation when available (C–1(b)). Paragraph
              ranges use en dashes; older reports may need a page as well
              (C–1(d)). Case short names are introduced with the first full
              citation (C–1(e)). Lookup retrieves the case name, and does not
              establish whether the case has been reported or remains good law.
            </p>
          </details>
          <details>
            <summary>How the SLR 2021 guide differs</summary>
            <p>
              The supplied Singapore Law Reports Style Guide 2021 covers
              judgment writing. Its paragraph-based cross-references (2–1.5)
              differ from academic footnotes. This workspace uses SAL academic
              footnotes; SLR judgment paragraphs and SAL Annual Review paragraph
              references are not automated.
            </p>
          </details>
          <details>
            <summary>Source coverage and your data</summary>
            <p>
              Structured forms cover cases, legislation, bound books, chapters,
              legal journals and web articles. Use free text for treaties,
              specialised foreign formats, scientific journals and other
              exceptional sources. Free text is preserved and does not trigger
              automatic short forms. Verify the source details before
              publication.
            </p>
            <p>
              Your workspace is saved in this browser. Only an explicit case
              lookup sends a neutral citation to this app’s server and
              eLitigation. Back up your workspace to move between devices or
              protect against cleared browser data. HTML export preserves
              formatting; it is a numbered list, not native Word footnotes.
            </p>
          </details>
        </div>
      </section>
    </>
  );
}

function FootnoteRow({
  note,
  output,
  number,
  first,
  last,
  onEdit,
  onRepeat,
  onRemove,
  onMove,
  onCopy,
}: {
  note: Footnote;
  output: CitationOutput;
  number: number;
  first: boolean;
  last: boolean;
  onEdit: () => void;
  onRepeat: () => void;
  onRemove: () => void;
  onMove: (d: number) => void;
  onCopy: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`footnote-row ${isDragging ? "dragging" : ""}`}
    >
      <div className="footnote-top">
        <div className="footnote-identity">
          <button
            ref={setActivatorNodeRef}
            className="drag-handle"
            {...attributes}
            {...listeners}
            aria-label={`Reorder footnote ${number}`}
            title="Drag, or press Space then arrow keys to reorder"
          >
            ⠿
          </button>
          <span className="footnote-number">
            {number.toString().padStart(2, "0")}
          </span>
          <span className="source-label">
            {sourceTypes.find((s) => s.type === note.type)?.label}
          </span>
        </div>
        <span
          className={`format-label ${output.issues.length ? "needs-attention" : ""}`}
        >
          {output.issues.length
            ? "Needs attention"
            : output.kind === "full"
              ? "Full citation"
              : output.kind === "manual"
                ? "Free text"
                : output.kind === "supra"
                  ? "supra"
                  : output.kind === "ibid"
                    ? "Ibid"
                    : "Id"}
        </span>
      </div>
      <p
        className="citation-text"
        dangerouslySetInnerHTML={{
          __html: output.html || "Incomplete citation",
        }}
      />
      {output.issues.length > 0 && (
        <p className="error-text">{output.issues.join(" ")}</p>
      )}
      <div className="row-actions">
        <button onClick={onEdit}>Edit</button>
        <button onClick={onRepeat}>Cite again</button>
        <button disabled={!!output.issues.length} onClick={onCopy}>
          Copy
        </button>
        <span className="row-spacer" />
        <button
          disabled={first}
          onClick={() => onMove(-1)}
          aria-label={`Move footnote ${number} up`}
        >
          ↑
        </button>
        <button
          disabled={last}
          onClick={() => onMove(1)}
          aria-label={`Move footnote ${number} down`}
        >
          ↓
        </button>
        <button
          className="remove-button"
          onClick={onRemove}
          aria-label={`Remove footnote ${number}`}
        >
          Remove
        </button>
      </div>
    </li>
  );
}
