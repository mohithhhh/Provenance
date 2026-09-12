export interface ComparisonRow {
  module: string;
  before: string;
  after: string;
  note?: string;
}

/** One row per module (A/B/C/F) — deliberately just the raw before/after
 * values side by side, not a collapsed "survived/collapsed" boolean: the
 * four modules measure genuinely different things (a z-score, a
 * probability, a retrieval match), so a single verdict would paper over
 * exactly the disagreement this whole project exists to show. */
export function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="text-xs text-zinc-500 dark:text-zinc-500">
            <th className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">Module</th>
            <th className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
              Before attack
            </th>
            <th className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
              After attack
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.module}>
              <td className="px-4 py-2 font-medium">{r.module}</td>
              <td className="px-4 py-2 font-mono">{r.before}</td>
              <td className="px-4 py-2 font-mono">
                {r.after}
                {r.note && (
                  <span className="ml-2 font-sans text-xs text-zinc-500 dark:text-zinc-500">
                    {r.note}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
