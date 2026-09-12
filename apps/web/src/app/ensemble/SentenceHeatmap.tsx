import type { DetectSentence } from '@/lib/api';

// Sequential color job (magnitude, not identity) — one hue, intensity only,
// per the dataviz skill's color formula. Blue is the skill's own validated
// default sequential hue (references/palette.md, step 500: #256abf),
// applied as a continuous alpha wash rather than discrete steps so no
// separate light/dark ramp is needed — the same hue reads correctly at low
// alpha on either surface. Text stays the page's normal ink color throughout
// ("text wears text tokens, never the series color").
const SEQUENTIAL_HUE = '37, 106, 191'; // #256abf as r, g, b

function washFor(topKFraction: number): string {
  const alpha = 0.08 + topKFraction * 0.5;
  return `rgba(${SEQUENTIAL_HUE}, ${alpha})`;
}

/** Per-sentence heatmap repurposing Module B's own existing per-sentence
 * output (top-10-token fraction — how much of the sentence was made of the
 * model's own top-predicted tokens) as a visual proxy for "how AI-like does
 * this span look" — not a real trained segmentation model (the DAMASHA line
 * of work this is inspired by; see docs/architecture.md for why extending
 * to a real per-segment classifier was out of scope here). */
export function SentenceHeatmap({ sentences }: { sentences: DetectSentence[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
        <span>Less predictable (more human-like)</span>
        <span className="flex h-3 w-24 overflow-hidden rounded">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="flex-1" style={{ backgroundColor: washFor(i / 7) }} />
          ))}
        </span>
        <span>More predictable (more AI-like)</span>
      </div>
      <p className="leading-8">
        {sentences.map((s, i) => (
          <span
            key={i}
            title={
              s.scored
                ? `top-10 fraction: ${(s.topKFraction * 100).toFixed(0)}%`
                : 'too short to score'
            }
            className="rounded px-1 py-0.5"
            style={{ backgroundColor: s.scored ? washFor(s.topKFraction) : undefined }}
          >
            {s.text}{' '}
          </span>
        ))}
      </p>
    </div>
  );
}
