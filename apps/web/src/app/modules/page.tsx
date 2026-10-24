import Link from 'next/link';
import { moduleByLetter } from '@/lib/modules';
import { LetterTile, PageHeader, PageShell } from '../ui';

// Grouped by what each method needs from you — the practical question when
// picking one — rather than listed A–G.
const GROUPS: { title: string; blurb: string; letters: string[] }[] = [
  {
    title: 'Read any text',
    blurb:
      'Paste anything. They judge the writing itself, with no outside record to check it against.',
    letters: ['B', 'C'],
  },
  {
    title: 'Need something on record first',
    blurb: 'Far more reliable, but only for text generated with a known key or logged here.',
    letters: ['A', 'F'],
  },
  {
    title: 'Check a signed file',
    blurb: 'Cryptographic verification instead of a statistical guess.',
    letters: ['D'],
  },
  {
    title: 'Combine and stress-test',
    blurb: 'Run the others together, or attack the text and watch which ones still hold.',
    letters: ['E', 'G'],
  },
];

export default function ModulesPage() {
  return (
    <PageShell wide>
      <PageHeader
        title="Seven ways to ask where text came from"
        lede="Each module answers a narrower question than “was this written by AI?” Pick by what you have: plain text, a key, a log, or a signed file."
      />

      <div className="flex flex-col gap-10">
        {GROUPS.map((g) => (
          <section
            key={g.title}
            className="grid grid-cols-1 gap-4 border-t border-zinc-200 pt-6 lg:grid-cols-[18rem_1fr] lg:gap-10 dark:border-zinc-800"
          >
            <div className="flex flex-col gap-1.5">
              <h2 className="section-title">{g.title}</h2>
              <p className="muted">{g.blurb}</p>
            </div>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {g.letters.map((letter) => {
                const m = moduleByLetter(letter);
                return (
                  <li key={letter}>
                    <Link
                      href={m.href}
                      className="panel group flex h-full items-start gap-4 transition-colors hover:border-accent-500/60"
                    >
                      <LetterTile letter={letter} size="sm" />
                      <span className="flex flex-col gap-1.5">
                        <span className="font-medium group-hover:text-accent-700 dark:group-hover:text-accent-100">
                          {m.name}
                        </span>
                        <span className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                          {m.summary}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          Needs {m.needs}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <section className="grid grid-cols-1 gap-4 border-t border-zinc-200 pt-6 lg:grid-cols-[18rem_1fr] lg:gap-10 dark:border-zinc-800">
          <div className="flex flex-col gap-1.5">
            <h2 className="section-title">Beyond one text</h2>
            <p className="muted">
              For working at volume, or checking the numbers behind all of this.
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-3">
            <Link href="/batch" className="btn btn-secondary">
              Batch mode
            </Link>
            <Link href="/benchmark" className="btn btn-secondary">
              Benchmark results
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
