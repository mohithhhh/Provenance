import type { WatermarkVerdict } from '@provenance/watermark-core';

const VERDICT_STYLES: Record<WatermarkVerdict, string> = {
  watermarked: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  human: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
  'insufficient-evidence': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
};

const VERDICT_LABELS: Record<WatermarkVerdict, string> = {
  watermarked: 'Watermarked',
  human: 'Not watermarked (with this key)',
  'insufficient-evidence': 'Insufficient evidence',
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
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <span
        className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${VERDICT_STYLES[verdict]}`}
      >
        {VERDICT_LABELS[verdict]}
      </span>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-zinc-500 dark:text-zinc-500">z-score</dt>
          <dd className="font-mono">{zScore.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-500">p-value</dt>
          <dd className="font-mono">{pValue < 0.0001 ? '< 0.0001' : pValue.toFixed(4)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-500">Scored tokens</dt>
          <dd className="font-mono">
            {greenCount}/{totalScored}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-500">Total tokens</dt>
          <dd className="font-mono">{totalTokens}</dd>
        </div>
      </dl>
      {verdict === 'insufficient-evidence' && (
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Fewer than 10 recognized, non-repeated tokens — too little evidence for a reliable z-test.
          Try a longer passage from the toy vocabulary.
        </p>
      )}
    </div>
  );
}
