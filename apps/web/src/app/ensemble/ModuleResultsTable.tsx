export interface ModuleResultRow {
  module: string;
  value: string;
  note?: string;
}

/** Every module's own result, side by side — never blended into the
 * combined score above. The point of an ensemble dashboard that shows
 * disagreement is that a reader can always drop back down to what each
 * method actually said on its own. */
export function ModuleResultsTable({ rows }: { rows: ModuleResultRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="text-xs text-zinc-500 dark:text-zinc-500">
            <th className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">Module</th>
            <th className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.module}>
              <td className="px-4 py-2 font-medium">{r.module}</td>
              <td className="px-4 py-2 font-mono">
                {r.value}
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
