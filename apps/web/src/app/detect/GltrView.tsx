import type { Bucket, DetectToken } from '@/lib/api';

const BUCKET_CLASSES: Record<Bucket, string> = {
  top10: 'bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-200',
  top100: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  top1000: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400',
  rest: 'text-zinc-500 dark:text-zinc-500',
};

const BUCKET_LABELS: Record<Bucket, string> = {
  top10: 'Top 10 predicted',
  top100: 'Top 100 predicted',
  top1000: 'Top 1,000 predicted',
  rest: 'Outside top 1,000',
};

/** GLTR-style per-token heatmap: darker/more saturated = the model
 * predicted this token more strongly (Gehrmann, Strobelt, Rush, 2019). */
export function GltrView({ tokens }: { tokens: DetectToken[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-500">
        {(Object.keys(BUCKET_LABELS) as Bucket[]).map((bucket) => (
          <span key={bucket} className="flex items-center gap-1.5">
            <span
              className={`inline-block h-3 w-3 rounded ${BUCKET_CLASSES[bucket]}`}
              aria-hidden
            />
            {BUCKET_LABELS[bucket]}
          </span>
        ))}
      </div>
      <p className="font-mono text-sm leading-8">
        {tokens.map((t, i) => (
          <span
            key={i}
            title={`rank ${t.rank} — ${BUCKET_LABELS[t.bucket]}`}
            className={`rounded px-0.5 ${BUCKET_CLASSES[t.bucket]}`}
          >
            {t.token}
          </span>
        ))}
      </p>
    </div>
  );
}
