import type { EnsembleVerdict } from '@/lib/ensemble';

const VERDICT_STYLES: Record<EnsembleVerdict, string> = {
  'likely-ai': 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  'likely-human': 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
  uncertain: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  disagreement: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
};

const VERDICT_LABELS: Record<EnsembleVerdict, string> = {
  'likely-ai': 'Likely AI-generated',
  'likely-human': 'Likely human-written',
  uncertain: 'Uncertain',
  disagreement: 'Modules disagree — abstaining',
};

export function EnsembleCard({
  verdict,
  probability,
  intervalLow,
  intervalHigh,
  disagreement,
}: {
  verdict: EnsembleVerdict;
  probability: number;
  intervalLow: number;
  intervalHigh: number;
  disagreement: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <span
        className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${VERDICT_STYLES[verdict]}`}
      >
        {VERDICT_LABELS[verdict]}
      </span>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-zinc-500 dark:text-zinc-500">Combined AI probability</dt>
          <dd className="font-mono">{(probability * 100).toFixed(1)}%</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-500">Combined interval</dt>
          <dd className="font-mono">
            {(intervalLow * 100).toFixed(1)}%–{(intervalHigh * 100).toFixed(1)}%
          </dd>
        </div>
      </dl>
      {disagreement ? (
        <p className="text-xs leading-5 text-amber-700 dark:text-amber-400">
          Module B and Module C reached opposite verdicts on this text. Rather than average over
          that and present a confident-looking number, this dashboard abstains — the disagreement
          itself is the finding. See each module&apos;s own result below.
        </p>
      ) : (
        <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-500">
          Inverse-variance-weighted combination of Modules B and C (fixed-effect meta-analysis,
          weighting each by 1/variance) — a real combination, not a replacement for either
          module&apos;s own verdict below. See{' '}
          <a
            href="https://github.com/mohithhhh/Provenance/blob/main/docs/architecture.md"
            className="underline underline-offset-2"
          >
            docs/architecture.md
          </a>
          .
        </p>
      )}
    </div>
  );
}
