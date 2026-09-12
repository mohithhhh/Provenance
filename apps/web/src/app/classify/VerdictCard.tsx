import type { ClassifyVerdict } from '@/lib/api';

const VERDICT_STYLES: Record<ClassifyVerdict, string> = {
  'likely-ai': 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  'likely-human': 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
  uncertain: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
};

const VERDICT_LABELS: Record<ClassifyVerdict, string> = {
  'likely-ai': 'Likely AI-generated',
  'likely-human': 'Likely human-written',
  uncertain: 'Uncertain',
};

export function VerdictCard({
  verdict,
  aiProbability,
  intervalLow,
  intervalHigh,
  confidenceLevel,
}: {
  verdict: ClassifyVerdict;
  aiProbability: number;
  intervalLow: number;
  intervalHigh: number;
  confidenceLevel: number;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <span
        className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${VERDICT_STYLES[verdict]}`}
      >
        {VERDICT_LABELS[verdict]}
      </span>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-zinc-500 dark:text-zinc-500">AI probability</dt>
          <dd className="font-mono">{(aiProbability * 100).toFixed(1)}%</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-500">
            {(confidenceLevel * 100).toFixed(0)}% confidence interval
          </dt>
          <dd className="font-mono">
            {(intervalLow * 100).toFixed(1)}%–{(intervalHigh * 100).toFixed(1)}%
          </dd>
        </div>
      </dl>
      <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-500">
        This interval is conformal-calibrated: across many predictions it contains the true answer
        at least {(confidenceLevel * 100).toFixed(0)}% of the time (see{' '}
        <a
          href="https://github.com/mohithhhh/Provenance/blob/main/docs/limitations.md"
          className="underline underline-offset-2"
        >
          docs/limitations.md
        </a>{' '}
        for what that guarantee does and doesn&apos;t promise).
      </p>
    </div>
  );
}
