import { LetterTile } from '../ui';

export interface ComparisonRow {
  letter?: string;
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
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Module</th>
            <th>Before the attack</th>
            <th>After the attack</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.module}>
              <td>
                <span className="flex items-center gap-3 font-medium whitespace-nowrap">
                  {r.letter && <LetterTile letter={r.letter} size="sm" />}
                  {r.module}
                </span>
              </td>
              <td className="align-middle">{r.before}</td>
              <td className="align-middle">
                <span className={r.after !== r.before ? 'font-medium' : ''}>{r.after}</span>
                {r.note && (
                  <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
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
