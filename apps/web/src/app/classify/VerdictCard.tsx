import type { ClassifyVerdict } from '@/lib/api';
import { Chip, DocLink, Stat, VERDICT_LABEL, VERDICT_TONE } from '../ui';

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
  const level = (confidenceLevel * 100).toFixed(0);
  return (
    <div className="panel flex flex-col gap-5">
      <Chip tone={VERDICT_TONE[verdict]!}>{VERDICT_LABEL[verdict]}</Chip>
      <dl className="grid grid-cols-2 gap-6">
        <Stat label="AI probability" value={`${(aiProbability * 100).toFixed(2)}%`} />
        <Stat
          label={`${level}% confidence interval`}
          value={`${(intervalLow * 100).toFixed(1)}–${(intervalHigh * 100).toFixed(1)}%`}
        />
      </dl>
      <IntervalBar low={intervalLow} high={intervalHigh} point={aiProbability} />
      <p className="muted">
        The interval is conformal-calibrated: across many predictions it contains the true answer at
        least {level}% of the time.{' '}
        <DocLink doc="limitations.md">What that does and doesn&apos;t promise</DocLink>.
      </p>
    </div>
  );
}

/** The 0–100% scale with the interval as a band and the point estimate as
 * a tick, so a wide interval reads as wide at a glance. */
function IntervalBar({ low, high, point }: { low: number; high: number; point: number }) {
  return (
    <div aria-hidden className="flex flex-col gap-1.5">
      <div className="relative h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="absolute inset-y-0 rounded-full bg-accent-500/35"
          style={{ left: `${low * 100}%`, width: `${(high - low) * 100}%` }}
        />
        <div
          className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded-full bg-accent-600 dark:bg-accent-500"
          style={{ left: `${point * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
        <span>0% (human)</span>
        <span>100% (AI)</span>
      </div>
    </div>
  );
}
