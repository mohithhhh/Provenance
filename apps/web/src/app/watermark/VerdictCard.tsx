import type { WatermarkVerdict } from '@provenance/watermark-core';
import { Chip, Stat, type Tone } from '../ui';

const VERDICT: Record<WatermarkVerdict, { tone: Tone; label: string }> = {
  watermarked: { tone: 'signal', label: 'Watermarked' },
  human: { tone: 'neutral', label: 'Not watermarked (with this key)' },
  'insufficient-evidence': { tone: 'caution', label: 'Insufficient evidence' },
};

export function VerdictCard({
  zScore,
  pValue,
  greenCount,
  totalScored,
  totalTokens,
  verdict,
}: {
  zScore: number;
  pValue: number;
  greenCount: number;
  totalScored: number;
  totalTokens: number;
  verdict: WatermarkVerdict;
}) {
  return (
    <div className="panel flex flex-col gap-5">
      <Chip tone={VERDICT[verdict].tone}>{VERDICT[verdict].label}</Chip>
      <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <Stat label="z-score" value={zScore.toFixed(2)} />
        <Stat label="p-value" value={pValue < 0.0001 ? '< 0.0001' : pValue.toFixed(4)} />
        <Stat label="Green / scored tokens" value={`${greenCount}/${totalScored}`} />
        <Stat label="Total tokens" value={totalTokens} />
      </dl>
      {verdict === 'insufficient-evidence' && (
        <p className="muted">
          Fewer than 10 recognized, non-repeated tokens, which is too little evidence for a reliable
          z-test. Try a longer passage from the toy vocabulary.
        </p>
      )}
    </div>
  );
}
