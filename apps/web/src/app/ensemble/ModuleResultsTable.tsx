import { Chip, LetterTile, VERDICT_LABEL, VERDICT_TONE } from '../ui';

export interface ModuleResultRow {
  letter: string;
  module: string;
  /** A text-module verdict, or `matched`/`no-match`/`error`. */
  verdict: string;
  value: string;
  note?: string;
}

const EXTRA_CHIPS: Record<string, { tone: 'signal' | 'neutral' | 'alert'; label: string }> = {
  matched: { tone: 'signal', label: 'Matched' },
  'no-match': { tone: 'neutral', label: 'No match' },
  error: { tone: 'alert', label: 'Error' },
};

/** Every module's own result, side by side — never blended into the
 * combined score above. The point of an ensemble dashboard that shows
 * disagreement is that a reader can always drop back down to what each
 * method actually said on its own. */
export function ModuleResultsTable({
  rows,
  bare,
  revealFromMs,
}: {
  rows: ModuleResultRow[];
  /** Drop the panel chrome when nested inside another panel. */
  bare?: boolean;
  /** Stagger rows in with the `.reveal` animation, starting at this delay. */
  revealFromMs?: number;
}) {
  return (
    <ul
      className={`flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800 ${bare ? '' : 'panel py-1 sm:py-1'}`}
    >
      {rows.map((r, i) => {
        const extra = EXTRA_CHIPS[r.verdict];
        return (
          <li
            key={r.letter}
            className={`flex items-center gap-4 py-3.5 ${revealFromMs !== undefined ? 'reveal' : ''}`}
            style={
              revealFromMs !== undefined
                ? { animationDelay: `${revealFromMs + i * 350}ms` }
                : undefined
            }
          >
            <LetterTile letter={r.letter} size="sm" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium">{r.module}</span>
              <span className="text-xs leading-5 text-zinc-500 tabular-nums dark:text-zinc-400">
                {r.value}
              </span>
              {r.note && (
                <span className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">{r.note}</span>
              )}
            </div>
            {extra ? (
              <Chip tone={extra.tone}>{extra.label}</Chip>
            ) : (
              <Chip tone={VERDICT_TONE[r.verdict] ?? 'neutral'}>
                {VERDICT_LABEL[r.verdict] ?? r.verdict}
              </Chip>
            )}
          </li>
        );
      })}
    </ul>
  );
}
