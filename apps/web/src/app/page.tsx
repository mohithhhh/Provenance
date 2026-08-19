import Link from 'next/link';

interface ModuleEntry {
  letter: string;
  name: string;
  status: 'live' | 'planned';
  href?: string;
}

const MODULES: ModuleEntry[] = [
  { letter: 'A', name: 'Watermarking', status: 'live', href: '/watermark' },
  { letter: 'B', name: 'Zero-shot statistical detector', status: 'planned' },
  { letter: 'C', name: 'Trained classifier', status: 'planned' },
  { letter: 'D', name: 'File provenance (C2PA)', status: 'planned' },
  { letter: 'E', name: 'Ensemble dashboard', status: 'planned' },
  { letter: 'F', name: 'Retrieval provenance ledger', status: 'live', href: '/ledger' },
  { letter: 'G', name: 'Attack Lab', status: 'planned' },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Provenance</h1>
        <p className="max-w-2xl text-lg leading-7 text-zinc-600 dark:text-zinc-400">
          A multi-method AI-content detection suite. Seven independent modules feed one ensemble
          layer that shows <strong>disagreement</strong> between methods rather than hiding it
          behind a single confidence number.
        </p>
        <p className="max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-500">
          This does not detect any vendor&apos;s real production watermark or AI classifier, and
          AI-content detection is not a solved problem — see{' '}
          <a
            href="https://github.com/mohithhhh/Provenance/blob/main/docs/limitations.md"
            className="underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            docs/limitations.md
          </a>{' '}
          for the full, honest scope.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
          Modules
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MODULES.map((m) => {
            const content = (
              <div className="flex h-full items-start gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-medium dark:bg-zinc-900">
                  {m.letter}
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{m.name}</span>
                  <span
                    className={
                      m.status === 'live'
                        ? 'text-xs font-medium text-emerald-600 dark:text-emerald-400'
                        : 'text-xs text-zinc-400 dark:text-zinc-600'
                    }
                  >
                    {m.status === 'live' ? 'Live' : 'Planned'}
                  </span>
                </div>
              </div>
            );
            return (
              <li key={m.letter}>
                {m.href ? (
                  <Link href={m.href} className="block h-full transition hover:opacity-80">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <Link
        href="/watermark"
        className="inline-flex w-fit items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Try the Watermark Lab →
      </Link>
    </main>
  );
}
