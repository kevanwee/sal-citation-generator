'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TextFootnote, CitationOutput } from '@/lib/types';

interface Props {
  footnote: TextFootnote;
  index: number;
  output: CitationOutput;
  onUpdate: (id: string, field: string, value: string) => void;
  onRemove: (id: string) => void;
}

export default function TextCard({ footnote, index, output, onUpdate, onRemove }: Props) {
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
          <button
            {...listeners}
            title="Drag to reorder"
            className="cursor-grab touch-none rounded p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
          >
            <DragIcon />
          </button>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-500 text-xs font-bold text-white tabular-nums">
            {index + 1}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            Free text
          </span>
        </div>
        <button
          type="button"
          onClick={() => onRemove(footnote.id)}
          className="rounded-md border border-transparent px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          Remove
        </button>
      </div>

      {/* Field */}
      <div className="p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Citation text</span>
          <input
            type="text"
            value={footnote.text}
            placeholder="Enter the full citation text"
            onChange={(e) => onUpdate(footnote.id, 'text', e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </label>

        {/* Citation output preview */}
        <div className="mt-4 rounded-lg border-l-4 border-slate-300 bg-slate-50 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 font-mono text-xs font-bold text-slate-500">{index + 1}.</span>
            <p
              className="text-sm leading-relaxed text-slate-700"
              dangerouslySetInnerHTML={{ __html: output.html }}
            />
          </div>
        </div>
      </div>
    </div>
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
