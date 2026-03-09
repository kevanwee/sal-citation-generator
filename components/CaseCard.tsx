'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CaseFootnote, CitationOutput } from '@/lib/types';

interface Props {
  footnote: CaseFootnote;
  index: number;
  output: CitationOutput;
  onUpdate: (id: string, field: string, value: string) => void;
  onRemove: (id: string) => void;
}

export default function CaseCard({ footnote, index, output, onUpdate, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: footnote.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`group rounded-xl border bg-white shadow-card transition-all duration-200 ${
        isDragging
          ? 'z-50 border-blue-300 shadow-card-hover opacity-80'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-card-hover'
      }`}
    >
      {/* Card header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Drag handle */}
          <button
            {...listeners}
            title="Drag to reorder"
            className="cursor-grab touch-none rounded p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
          >
            <DragIcon />
          </button>
          {/* Badge */}
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white tabular-nums">
            {index + 1}
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              Case citation
            </span>
            {footnote.source === 'elitigation' && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                eLitigation
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(footnote.id)}
          className="rounded-md border border-transparent px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          Remove
        </button>
      </div>

      {/* Fields */}
      <div className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FieldInput
            label="Case name"
            value={footnote.caseName}
            placeholder="e.g. Tan Kim Seng v Victor Adam Ibrahim"
            onChange={(v) => onUpdate(footnote.id, 'caseName', v)}
            className="sm:col-span-2"
          />
          <FieldInput
            label="Short name (for supra)"
            value={footnote.shortName}
            placeholder="e.g. Tan Kim Seng"
            onChange={(v) => onUpdate(footnote.id, 'shortName', v)}
            className="sm:col-span-2"
          />
          <FieldInput
            label="SLR / Report citation"
            value={footnote.reportCitation}
            placeholder="e.g. [2002] 3 SLR(R) 345"
            onChange={(v) => onUpdate(footnote.id, 'reportCitation', v)}
            className="sm:col-span-2 lg:col-span-4"
            hint="Overrides neutral citation when provided"
          />
          <FieldInput
            label="Year"
            value={footnote.year}
            placeholder="YYYY"
            onChange={(v) => onUpdate(footnote.id, 'year', v)}
          />
          <FieldInput
            label="Court"
            value={footnote.court}
            placeholder="SGCA / SGHC"
            onChange={(v) => onUpdate(footnote.id, 'court', v)}
          />
          <FieldInput
            label="Case number"
            value={footnote.caseNo}
            placeholder="e.g. 5"
            onChange={(v) => onUpdate(footnote.id, 'caseNo', v)}
            className="sm:col-span-2 lg:col-span-1"
          />
          {/* spacer on lg */}
          <div className="hidden lg:block" />
          <FieldInput
            label="Pinpoint start ¶"
            value={footnote.paraStart}
            placeholder="e.g. 12"
            onChange={(v) => onUpdate(footnote.id, 'paraStart', v)}
          />
          <FieldInput
            label="Pinpoint end ¶"
            value={footnote.paraEnd}
            placeholder="Optional"
            onChange={(v) => onUpdate(footnote.id, 'paraEnd', v)}
          />
        </div>

        {/* Citation output preview */}
        <div className="mt-4 rounded-lg border-l-4 border-blue-400 bg-slate-50 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 font-mono text-xs font-bold text-blue-600">{index + 1}.</span>
            <p
              className="text-sm leading-relaxed text-slate-700 [&_.italic]:italic"
              dangerouslySetInnerHTML={{ __html: output.html }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

interface FieldInputProps {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
  hint?: string;
}

function FieldInput({ label, value, placeholder, onChange, className = '', hint }: FieldInputProps) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

function DragIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="9" cy="5" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="15" cy="5" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="15" cy="19" r="1.5" />
    </svg>
  );
}
