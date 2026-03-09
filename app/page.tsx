import CitationManager from '@/components/CitationManager';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-lg text-white shadow-sm">
              ⚖
            </div>
            <div>
              <h1 className="text-[15px] font-bold leading-tight tracking-tight text-slate-900">
                SAL Citation Generator
              </h1>
              <p className="hidden text-[11px] text-slate-500 sm:block">
                Singapore Academic Law · Short-form citation helper
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 sm:inline-flex">
              <span className="italic">Ibid</span>
              <span className="text-blue-300">·</span>
              <span className="italic">Id</span>
              <span className="text-blue-300">·</span>
              <span className="italic">supra</span>
            </span>
            <a
              href="https://github.com/kevanwee/sal-citation-generator"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
              aria-label="View on GitHub"
            >
              <GitHubIcon />
            </a>
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8">
        {/* Intro */}
        <div className="mb-8">
          <p className="max-w-2xl text-[15px] leading-relaxed text-slate-600">
            Generate and manage Singapore case citations with automatic short-form references.
            Paste an eLitigation URL or enter text manually — citations update in real time as
            you build your footnote list.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge label="Neutral citations" />
            <Badge label="SLR / report citations" />
            <Badge label="Ibid · Id · supra" italic />
            <Badge label="Drag to reorder" />
          </div>
        </div>

        <CitationManager />
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 py-6">
        <div className="mx-auto max-w-5xl px-4">
          <p className="text-center text-xs text-slate-400">
            SAL Citation Generator &mdash; client-side only, no data leaves your browser.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Badge({ label, italic }: { label: string; italic?: boolean }) {
  return (
    <span
      className={`rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-500 ${italic ? 'italic' : ''}`}
    >
      {label}
    </span>
  );
}

function GitHubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
