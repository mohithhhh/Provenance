import type { ClassifyFeature } from '@/lib/api';

/** Sorted by |contribution| — the features that actually moved this
 * prediction's logit the most, not just the model's globally biggest
 * coefficients (which wouldn't reflect what THIS text looks like). */
export function FeatureTable({ features }: { features: ClassifyFeature[] }) {
  const sorted = [...features].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="text-xs text-zinc-500 dark:text-zinc-500">
            <th className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">Feature</th>
            <th className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">Value</th>
            <th className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
              Contribution
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((f) => (
            <tr key={f.name}>
              <td className="px-4 py-2 font-mono">{f.name}</td>
              <td className="px-4 py-2 font-mono">{f.value.toFixed(3)}</td>
              <td
                className={`px-4 py-2 font-mono ${
                  f.contribution > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : f.contribution < 0
                      ? 'text-zinc-500 dark:text-zinc-500'
                      : ''
                }`}
              >
                {f.contribution >= 0 ? '+' : ''}
                {f.contribution.toFixed(3)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
