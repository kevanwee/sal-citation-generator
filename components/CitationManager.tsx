'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import {
  computeCitationOutputs,
  parseElitigationUrl,
  createCaseFootnoteFromElitigation,
  createTextFootnote,
} from '@/lib/citationEngine';
import type { Footnote, CaseFootnote, TextFootnote } from '@/lib/types';
import CaseCard from './CaseCard';
import TextCard from './TextCard';

const STORAGE_KEY = 'sal-citation-generator:v2';

type StatusKind = 'info' | 'success' | 'error' | 'warn';

interface Status {
  message: string;
  kind: StatusKind;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function loadState(): Footnote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Record<string, unknown>[]).map((item) => ({
      ...item,
      id: typeof item['id'] === 'string' ? item['id'] : generateId(),
    })) as Footnote[];
  } catch {
    return [];
  }
}

export default function CitationManager() {
  const [footnotes, setFootnotes] = useState<Footnote[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadState();
  });
  const [mode, setMode] = useState<'elitigation' | 'manual'>('elitigation');
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<Status | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const outputs = useMemo(() => computeCitationOutputs(footnotes), [footnotes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(footnotes));
  }, [footnotes]);

  const showStatus = useCallback((message: string, kind: StatusKind = 'info') => {
    setStatus({ message, kind });
  }, []);

  function handleAdd() {
    const input = inputValue.trim();
    if (!input) {
      showStatus('Please enter a citation input.', 'warn');
      return;
    }

    if (mode === 'elitigation') {
      const parsed = parseElitigationUrl(input);
      if (!parsed) {
        showStatus(
          'Could not parse URL. Expected a neutral citation like 2023_SGCA_5.',
          'error',
        );
        return;
      }
      const newNote: CaseFootnote = {
        ...(createCaseFootnoteFromElitigation(parsed) as Omit<CaseFootnote, 'id'>),
        id: generateId(),
      };
      setFootnotes((prev) => [...prev, newNote]);
      showStatus('Added eLitigation citation stub — fill in case details below.', 'success');
    } else {
      const newNote: TextFootnote = {
        ...(createTextFootnote(input) as Omit<TextFootnote, 'id'>),
        id: generateId(),
      };
      setFootnotes((prev) => [...prev, newNote]);
      showStatus('Added manual citation text.', 'success');
    }
    setInputValue('');
  }

  function handleRemove(id: string) {
    setFootnotes((prev) => prev.filter((f) => f.id !== id));
  }

  function handleUpdate(id: string, field: string, value: string) {
    setFootnotes((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
    );
  }

  function handleClear() {
    setFootnotes([]);
    showStatus('All citations cleared.', 'info');
  }

  async function handleCopyAll() {
    if (!footnotes.length) {
      showStatus('No citations to copy.', 'warn');
      return;
    }
    const text = outputs.map((o, i) => `${i + 1}. ${o.text}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      showStatus('Citations copied to clipboard.', 'success');
    } catch {
      showStatus('Clipboard copy failed.', 'error');
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFootnotes((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  const placeholder =
    mode === 'elitigation'
      ? 'Paste eLitigation URL — e.g. https://www.elitigation.sg/gd/s/2023_SGCA_5'
      : 'Enter manual citation text';

  const statusColour =
    status?.kind === 'success'
      ? 'text-emerald-700'
      : status?.kind === 'error'
        ? 'text-red-600'
        : status?.kind === 'warn'
          ? 'text-amber-600'
          : 'text-slate-500';

  return (
    <div className="space-y-6">
      {/* ── Input panel ─────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        {/* Source toggle */}
        <div className="mb-5 flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Source
          </span>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <ToggleBtn
              active={mode === 'elitigation'}
              onClick={() => setMode('elitigation')}
            >
              eLitigation URL
            </ToggleBtn>
            <ToggleBtn active={mode === 'manual'} onClick={() => setMode('manual')}>
              Manual Text
            </ToggleBtn>
          </div>
        </div>

        {/* Input row */}
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={placeholder}
            className="min-w-0 flex-1 basis-80 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800"
          >
            <PlusIcon />
            Add Citation
          </button>
          <button
            type="button"
            onClick={handleCopyAll}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2"
          >
            <CopyIcon />
            Copy All
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2"
          >
            Clear All
          </button>
        </div>

        {/* Status */}
        {status && (
          <p className={`mt-3 flex items-center gap-1.5 text-sm ${statusColour}`}>
            <StatusIcon kind={status.kind} />
            {status.message}
          </p>
        )}
      </section>

      {/* ── Footnote list ────────────────────────────────────────── */}
      {footnotes.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {/* Count bar */}
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-sm font-medium text-slate-600">
              {footnotes.length}&nbsp;
              {footnotes.length === 1 ? 'footnote' : 'footnotes'}
            </p>
            <p className="flex items-center gap-1 text-xs text-slate-400">
              <DragIndicatorIcon />
              Drag to reorder
            </p>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={footnotes.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {footnotes.map((footnote, index) =>
                  footnote.type === 'case' ? (
                    <CaseCard
                      key={footnote.id}
                      footnote={footnote}
                      index={index}
                      output={outputs[index]}
                      onUpdate={handleUpdate}
                      onRemove={handleRemove}
                    />
                  ) : (
                    <TextCard
                      key={footnote.id}
                      footnote={footnote}
                      index={index}
                      output={outputs[index]}
                      onUpdate={handleUpdate}
                      onRemove={handleRemove}
                    />
                  ),
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Local sub-components
// ---------------------------------------------------------------------------

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
        active
          ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200'
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
        ⚖️
      </div>
      <p className="text-sm font-semibold text-slate-700">No citations yet</p>
      <p className="mt-1 max-w-xs text-xs text-slate-400">
        Add a case URL or manual citation above. Citations auto-update with{' '}
        <em>Ibid</em>, <em>Id</em>, and <em>supra</em> as you build your list.
      </p>
    </div>
  );
}

function StatusIcon({ kind }: { kind: StatusKind }) {
  if (kind === 'success')
    return (
      <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
    );
  if (kind === 'error')
    return (
      <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
    );
  if (kind === 'warn')
    return (
      <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
    );
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
      <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
    </svg>
  );
}

function DragIndicatorIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="5" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="15" cy="5" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="15" cy="19" r="1.5" />
    </svg>
  );
}
