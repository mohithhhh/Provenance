import type { ClassifyFeature } from '@/lib/api';

/** Sorted by |contribution| — the features that actually moved this
 * prediction's logit the most, not just the model's globally biggest
 * coefficients (which wouldn't reflect what THIS text looks like). Bars
 * diverge from a center line: right pushes toward AI, left toward human. */
export function FeatureTable({ features }: { features: ClassifyFeature[] }) {
  const sorted = [...features].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const max = Math.max(...sorted.map((f) => Math.abs(f.contribution)), 1e-9);

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Feature</th>
            <th>Value</th>
            <th className="w-1/3">
              <span className="flex justify-between">
                <span>Toward human</span>
                <span>Toward AI</span>
              </span>
            </th>
            <th className="text-right">Contribution</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((f) => {
            const width = (Math.abs(f.contribution) / max) * 50;
            return (
              <tr key={f.name}>
                <td className="font-mono text-xs">{f.name}</td>
                <td>{f.value.toFixed(3)}</td>
                <td className="align-middle">
                  <div className="relative h-2.5 rounded-sm bg-zinc-100 dark:bg-zinc-800">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-300 dark:bg-zinc-600" />
                    <div
                      className={`absolute inset-y-0 rounded-sm ${
                        f.contribution > 0 ? 'bg-rose-500/70' : 'bg-zinc-400 dark:bg-zinc-500'
                      }`}
                      style={
                        f.contribution > 0
                          ? { left: '50%', width: `${width}%` }
                          : { right: '50%', width: `${width}%` }
                      }
                    />
                  </div>
                </td>
                <td
                  className={`text-right ${
                    f.contribution > 0
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {f.contribution >= 0 ? '+' : ''}
                  {f.contribution.toFixed(3)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
