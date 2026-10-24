import type { EnsembleVerdict } from '@/lib/ensemble';
import { Chip, DocLink, Stat, VERDICT_LABEL, VERDICT_TONE } from '../ui';

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
    <div className="panel flex flex-col gap-5">
      <Chip tone={VERDICT_TONE[verdict]!}>{VERDICT_LABEL[verdict]}</Chip>
      <dl className="grid grid-cols-2 gap-6">
        <Stat label="Combined AI probability" value={`${(probability * 100).toFixed(1)}%`} />
        <Stat
          label="Combined interval"
          value={`${(intervalLow * 100).toFixed(1)}–${(intervalHigh * 100).toFixed(1)}%`}
        />
      </dl>
      {disagreement ? (
        <p className="text-sm leading-6 text-amber-800 dark:text-amber-300">
          Modules B and C reached opposite verdicts. Rather than average that into a
          confident-looking number, the ensemble abstains. The disagreement is the finding, so check
          each module&apos;s own result below.
        </p>
      ) : (
        <p className="muted">
          Inverse-variance weighting of B and C (a fixed-effect meta-analysis, each weighted by
          1/variance). It sits alongside each module&apos;s own verdict, never in place of it.{' '}
          <DocLink doc="architecture.md">How the combination works</DocLink>.
        </p>
      )}
    </div>
  );
}
