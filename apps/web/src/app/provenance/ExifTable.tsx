export function ExifTable({ exif }: { exif: Record<string, string> }) {
  const entries = Object.entries(exif);
  if (entries.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">No EXIF metadata found.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="text-xs text-zinc-500 dark:text-zinc-500">
            <th className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">Tag</th>
            <th className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([name, value]) => (
            <tr key={name}>
              <td className="px-4 py-2 font-mono">{name}</td>
              <td className="max-w-md break-words px-4 py-2 font-mono">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
