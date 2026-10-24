import type { StatisticalVerdict } from '@/lib/api';
import { B_AI_THRESHOLD, B_HUMAN_THRESHOLD } from '@/lib/ensemble';
import { Chip, Stat, VERDICT_LABEL, VERDICT_TONE } from '../ui';

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
    <div className="panel flex flex-col gap-5">
      <Chip tone={VERDICT_TONE[verdict]!}>{VERDICT_LABEL[verdict]}</Chip>
      <dl className="grid grid-cols-2 gap-6 sm:grid-cols-5">
        <Stat label="Binoculars score" value={binocularsScore.toFixed(3)} />
        <Stat label="Perplexity" value={perplexity.toFixed(1)} />
        <Stat label="Cross-perplexity" value={crossPerplexity.toFixed(1)} />
        <Stat label="Top-10 fraction" value={`${(top10Fraction * 100).toFixed(1)}%`} />
        <Stat label="Burstiness" value={burstiness.toFixed(3)} />
      </dl>
      <p className="muted">
        Lower Binoculars scores read as more machine-like. Below {B_AI_THRESHOLD} is flagged AI,
        above {B_HUMAN_THRESHOLD} is flagged human, and the band between is uncertain.
      </p>
    </div>
  );
}
