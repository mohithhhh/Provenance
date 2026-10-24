import Link from 'next/link';
import type { ReactNode } from 'react';
import { MODULES, moduleByLetter } from '@/lib/modules';

const REPO = 'https://github.com/mohithhhh/Provenance/blob/main';

export function DocLink({ doc, children }: { doc: string; children: ReactNode }) {
  return (
    <a href={`${REPO}/docs/${doc}`} className="link">
      {children}
    </a>
  );
}

/** A–G wayfinding strip shown on every tool page. */
export function ModuleRail({ current }: { current?: string }) {
  return (
    <nav aria-label="Modules" className="-mx-1 overflow-x-auto px-1 pb-1">
      <ul className="flex w-max gap-1 rounded-xl border border-zinc-200 bg-white/80 p-1 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/70">
        {MODULES.map((m) => {
          const active = m.letter === current;
          return (
            <li key={m.letter}>
              <Link
                href={m.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-accent-600 text-white dark:bg-accent-500'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                }`}
              >
                <span
                  aria-hidden
                  className={`font-display flex h-5 w-5 items-center justify-center rounded text-xs font-bold ${
                    active
                      ? 'bg-white/20'
                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                  }`}
                >
                  {m.letter}
                </span>
                {m.short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function LetterTile({ letter, size = 'lg' }: { letter: string; size?: 'sm' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={`font-display flex shrink-0 items-center justify-center font-bold ${
        size === 'lg'
          ? 'h-12 w-12 rounded-xl bg-accent-600 text-xl text-white shadow-sm dark:bg-accent-500'
          : 'h-9 w-9 rounded-lg bg-accent-50 text-base text-accent-700 dark:bg-accent-500/15 dark:text-accent-100'
      }`}
    >
      {letter}
    </span>
  );
}

/** Every tool page opens the same way: rail, title, a one-sentence lede,
 * and the full method/limitations text behind a disclosure — kept, not
 * cut, just no longer the first thing a visitor has to read. */
export function PageHeader({
  letter,
  title,
  lede,
  children,
}: {
  letter?: string;
  title?: string;
  lede: ReactNode;
  children?: ReactNode;
}) {
  const heading = title ?? (letter ? moduleByLetter(letter).name : '');
  return (
    <header className="flex flex-col gap-8">
      <ModuleRail current={letter} />
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          {letter && <LetterTile letter={letter} />}
          <h1 className="text-3xl leading-tight font-semibold tracking-[-0.025em] sm:text-4xl">
            {letter && <span className="sr-only">Module {letter}: </span>}
            {heading}
          </h1>
        </div>
        {/* pl-16 = the 3rem tile + 1rem gap, so the text lines up under the
            title on wider screens and uses the full width on phones. */}
        <div className={`flex min-w-0 flex-col gap-3 ${letter ? 'sm:pl-16' : ''}`}>
          <p className="max-w-2xl text-lg leading-7 text-zinc-700 dark:text-zinc-300">{lede}</p>
          {children && (
            <details className="group max-w-2xl">
              <summary className="w-fit cursor-pointer text-sm font-medium text-accent-700 select-none hover:underline dark:text-accent-500">
                How it works and its limits
              </summary>
              <div className="mt-3 flex flex-col gap-3 border-l-2 border-zinc-200 pl-4 text-sm leading-6 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                {children}
              </div>
            </details>
          )}
        </div>
      </div>
    </header>
  );
}

export function PageShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <main
      className={`mx-auto flex w-full ${wide ? 'max-w-6xl' : 'max-w-4xl'} flex-1 flex-col gap-12 px-6 py-12 sm:py-16`}
    >
      {children}
    </main>
  );
}

export function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="section-title">{title}</h2>
          {description && <p className="muted max-w-2xl">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** A reading: small label, large tabular figure. */
export function Stat({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="font-display text-2xl font-semibold tracking-tight tabular-nums">{value}</dd>
    </div>
  );
}

export type Tone = 'alert' | 'caution' | 'signal' | 'neutral';

export function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`chip tone-${tone}`}>{children}</span>;
}

/** Maps the verdict strings every text module returns to a chip tone. */
export const VERDICT_TONE: Record<string, Tone> = {
  'likely-ai': 'alert',
  'likely-human': 'neutral',
  uncertain: 'caution',
  disagreement: 'caution',
};

export const VERDICT_LABEL: Record<string, string> = {
  'likely-ai': 'Likely AI-generated',
  'likely-human': 'Likely human-written',
  uncertain: 'Uncertain',
  disagreement: 'Modules disagree, abstaining',
};
