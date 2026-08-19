export interface ChartSeries {
  label: string;
  color: string;
  points: { x: number; y: number }[];
}

export interface LineChartProps {
  series: ChartSeries[];
  xLabel: string;
  yLabel: string;
  /** Optional horizontal reference line (e.g. the detection threshold). */
  threshold?: { y: number; label: string };
  formatX?: (x: number) => string;
  formatY?: (y: number) => string;
}

const WIDTH = 560;
const HEIGHT = 260;
const PADDING = { top: 16, right: 16, bottom: 36, left: 44 };

function niceTicks(min: number, max: number, count: number): number[] {
  if (min === max) return [min];
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, i) => min + step * i);
}

/** A minimal, dependency-free SVG line chart following the dataviz skill's
 * mark specs: thin 2px lines, small markers with native tooltips, a legend
 * for multi-series, recessive gridlines, and a table-view fallback for
 * accessibility. */
export function LineChart({ series, xLabel, yLabel, threshold, formatX, formatY }: LineChartProps) {
  const allPoints = series.flatMap((s) => s.points);
  const xs = allPoints.map((p) => p.x);
  const ys = allPoints.map((p) => p.y);
  const yMin = Math.min(0, ...ys, threshold?.y ?? 0);
  const yMax = Math.max(...ys, threshold?.y ?? 0, 0.01);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs, xMin + 0.01);

  const plotW = WIDTH - PADDING.left - PADDING.right;
  const plotH = HEIGHT - PADDING.top - PADDING.bottom;

  const sx = (x: number) => PADDING.left + ((x - xMin) / (xMax - xMin)) * plotW;
  const sy = (y: number) => PADDING.top + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

  const yTicks = niceTicks(yMin, yMax, 4);
  const fmtX = formatX ?? ((x: number) => String(x));
  const fmtY = formatY ?? ((y: number) => y.toFixed(1));

  return (
    <div className="flex flex-col gap-2">
      {series.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--chart-text-secondary)]">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden
              />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${yLabel} by ${xLabel}`}
        className="w-full rounded bg-[var(--chart-surface)]"
      >
        {/* Gridlines */}
        {yTicks.map((t) => (
          <line
            key={t}
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={sy(t)}
            y2={sy(t)}
            stroke="var(--chart-gridline)"
            strokeWidth={1}
          />
        ))}
        {/* Axes */}
        <line
          x1={PADDING.left}
          x2={WIDTH - PADDING.right}
          y1={sy(Math.max(yMin, 0))}
          y2={sy(Math.max(yMin, 0))}
          stroke="var(--chart-baseline)"
          strokeWidth={1}
        />
        {/* Y tick labels */}
        {yTicks.map((t) => (
          <text
            key={t}
            x={PADDING.left - 8}
            y={sy(t)}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-[var(--chart-muted)] text-[10px]"
          >
            {fmtY(t)}
          </text>
        ))}
        {/* X tick labels (from the first series' x values) */}
        {(series[0]?.points ?? []).map((p) => (
          <text
            key={p.x}
            x={sx(p.x)}
            y={HEIGHT - PADDING.bottom + 16}
            textAnchor="middle"
            className="fill-[var(--chart-muted)] text-[10px]"
          >
            {fmtX(p.x)}
          </text>
        ))}
        {/* Threshold reference line */}
        {threshold && (
          <>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={sy(threshold.y)}
              y2={sy(threshold.y)}
              stroke="var(--chart-status-critical)"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            <text
              x={WIDTH - PADDING.right}
              y={sy(threshold.y) - 4}
              textAnchor="end"
              className="fill-[var(--chart-status-critical)] text-[10px]"
            >
              {threshold.label}
            </text>
          </>
        )}
        {/* Series lines + markers */}
        {series.map((s) => (
          <g key={s.label}>
            <path
              d={s.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x)} ${sy(p.y)}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {s.points.map((p) => (
              <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={3.5} fill={s.color}>
                <title>
                  {s.label}: {xLabel} {fmtX(p.x)}, {yLabel} {fmtY(p.y)}
                </title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      <details className="text-xs text-[var(--chart-text-secondary)]">
        <summary className="cursor-pointer select-none">Table view</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="border-b border-zinc-200 py-1 pr-4 dark:border-zinc-800">
                  {xLabel}
                </th>
                {series.map((s) => (
                  <th
                    key={s.label}
                    className="border-b border-zinc-200 py-1 pr-4 dark:border-zinc-800"
                  >
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(series[0]?.points ?? []).map((p, i) => (
                <tr key={p.x}>
                  <td className="py-1 pr-4 font-mono">{fmtX(p.x)}</td>
                  {series.map((s) => (
                    <td key={s.label} className="py-1 pr-4 font-mono">
                      {fmtY(s.points[i]?.y ?? NaN)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
