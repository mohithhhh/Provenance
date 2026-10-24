export function ExifTable({ exif }: { exif: Record<string, string> }) {
  const entries = Object.entries(exif);
  if (entries.length === 0) {
    return <p className="empty">This file has no EXIF metadata.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Tag</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([name, value]) => (
            <tr key={name}>
              <td className="font-mono text-xs">{name}</td>
              <td className="max-w-md break-words">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
