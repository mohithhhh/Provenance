import type { StatisticalVerdict } from '@/lib/api';

const VERDICT_STYLES: Record<StatisticalVerdict, string> = {
  'likely-ai': 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  'likely-human': 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
  uncertain: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
};

const VERDICT_LABELS: Record<StatisticalVerdict, string> = {
  'likely-ai': 'Likely AI-generated',
  'likely-human': 'Likely human-written',
  uncertain: 'Uncertain',
};

export function VerdictCard({
  verdict,
  binocularsScore,
  perplexity,
  crossPerplexity,
  top10Fraction,
  burstiness,
}: {
  verdict: StatisticalVerdict;
  binocularsScore: number;
  perplexity: number;
  crossPerplexity: number;
  top10Fraction: number;
  burstiness: number;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <span
        className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${VERDICT_STYLES[verdict]}`}
      >
        {VERDICT_LABELS[verdict]}
      </span>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-5">
        <div>
          <dt className="text-zinc-500 dark:text-zinc-500">Binoculars score</dt>
          <dd className="font-mono">{binocularsScore.toFixed(3)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-500">Perplexity</dt>
          <dd className="font-mono">{perplexity.toFixed(1)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-500">Cross-perplexity</dt>
          <dd className="font-mono">{crossPerplexity.toFixed(1)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-500">Top-10 fraction</dt>
          <dd className="font-mono">{(top10Fraction * 100).toFixed(1)}%</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-500">Burstiness</dt>
          <dd className="font-mono">{burstiness.toFixed(3)}</dd>
        </div>
      </dl>
    </div>
  );
}
