import { B_AI_THRESHOLD, B_HUMAN_THRESHOLD } from '@/lib/ensemble';
import { DocLink, PageHeader, PageShell, Section, Stat } from '../ui';

// Every number below is copied from docs/benchmark.md, which records the
// committed script that produced it. Change them there first.

// Sequential, single hue (the site accent), intensity = magnitude.
function heat(fraction: number): string {
  return `rgba(37, 137, 177, ${0.06 + fraction * 0.5})`;
}

function HeatCell({ value, total }: { value: number; total?: number }) {
  const fraction = total ? value / total : value;
  return (
    <td style={{ backgroundColor: heat(fraction) }} className="text-center">
      {total ? `${value}/${total}` : `${Math.round(value * 100)}%`}
    </td>
  );
}

const ATTACK_ROWS: [string, string, number, number, number][] = [
  ['None', '—', 16, 7, 16],
  ['Synonym', '0.3', 15, 7, 16],
  ['Synonym', '0.6', 14, 7, 16],
  ['Reorder', '0.3', 16, 7, 16],
  ['Reorder', '0.6', 15, 7, 16],
  ['Truncate', '0.3', 14, 7, 16],
  ['Truncate', '0.6', 14, 7, 9],
  ['Paraphrase', '—', 16, 9, 16],
];

const WATERMARK_STRENGTHS = ['0%', '20%', '40%', '75%', '100%'];
const WATERMARK_ROWS: [string, number[]][] = [
  ['Substitute', [1, 0.57, 0, 0, 0]],
  ['Delete', [1, 0.87, 0.4, 0, 0]],
  ['Insert', [1, 1, 0.6, 0.1, 0.03]],
  ['Reorder', [1, 0.57, 0.27, 0, 0]],
];

// Module B calibration ranges and the axis they're drawn on.
const B_RANGES = [
  { label: 'AI (gpt2-generated)', min: 0.093, max: 0.225, className: 'bg-rose-500/70' },
  { label: 'Human (original)', min: 0.294, max: 0.725, className: 'bg-zinc-400 dark:bg-zinc-500' },
];
const B_AXIS_MAX = 0.8;
const pos = (v: number) => `${(v / B_AXIS_MAX) * 100}%`;

export default function BenchmarkPage() {
  return (
    <PageShell>
      <PageHeader
        title="Benchmark"
        lede="Every number here comes from a committed script you can rerun. Small samples are labelled as small."
      >
        <p>
          Full methodology, every table, and how to reproduce each run are in{' '}
          <DocLink doc="benchmark.md">docs/benchmark.md</DocLink>. The caveats for each number are
          in <DocLink doc="limitations.md">docs/limitations.md</DocLink>.
        </p>
      </PageHeader>

      <Section
        title="Accuracy under attack"
        description="From the Attack Lab's benchmark, n = 16 (8 human, 8 gpt2-generated). B and C count texts still labelled correctly as human or AI. F counts texts still matched to their own logged original, a different kind of correctness that isn't directly comparable."
      >
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Attack</th>
                <th>Strength</th>
                <th className="text-center">B, statistical</th>
                <th className="text-center">C, classifier</th>
                <th className="text-center">F, ledger</th>
              </tr>
            </thead>
            <tbody>
              {ATTACK_ROWS.map(([attack, strength, b, c, f]) => (
                <tr key={attack + strength}>
                  <td className="font-medium">{attack}</td>
                  <td>{strength}</td>
                  <HeatCell value={b} total={16} />
                  <HeatCell value={c} total={16} />
                  <HeatCell value={f} total={16} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted max-w-2xl">
          The real paraphrase attack turned out to be the <em>least</em> damaging here, the opposite
          of this project&apos;s own expectation going in. That reflects the small T5 checkpoint
          used, not a refutation of the published result.
        </p>
      </Section>

      <Section
        title="Trained classifier (C)"
        description="Held-out test split, n = 767, trained on HC3 (CC-BY-SA 4.0)."
      >
        <div className="panel flex flex-col gap-5">
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Accuracy" value="0.814" />
            <Stat label="Precision" value="0.789" />
            <Stat label="Recall" value="0.867" />
            <Stat label="F1" value="0.826" />
            <Stat label="ROC-AUC" value="0.896" />
            <Stat label="Interval coverage" value="91.9%" />
          </dl>
          <p className="muted">
            Coverage targets 90%. These numbers hold for HC3-like text. On the Attack Lab&apos;s
            different domain and generator, C labels only 7 of 16 correctly (above).
          </p>
        </div>
      </Section>

      <Section
        title="Statistical detector (B)"
        description="Calibration ranges of the Binoculars-style score (gpt2 performer, distilgpt2 observer). Lower reads as more machine-like."
      >
        <div className="panel flex flex-col gap-4">
          {B_RANGES.map((r) => (
            <div
              key={r.label}
              className="grid grid-cols-[9rem_1fr] items-center gap-4 sm:grid-cols-[11rem_1fr]"
            >
              <span className="text-sm">{r.label}</span>
              <div className="relative h-6 rounded bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`absolute inset-y-1 rounded-sm ${r.className}`}
                  style={{ left: pos(r.min), width: pos(r.max - r.min) }}
                  title={`${r.min} to ${r.max}`}
                />
                {[B_AI_THRESHOLD, B_HUMAN_THRESHOLD].map((t) => (
                  <div
                    key={t}
                    className="absolute inset-y-0 border-l border-dashed border-accent-600 dark:border-accent-500"
                    style={{ left: pos(t) }}
                  />
                ))}
              </div>
            </div>
          ))}
          <p className="muted">
            Scale 0 to {B_AXIS_MAX}. Dashed lines mark the thresholds: below {B_AI_THRESHOLD} is
            flagged AI, above {B_HUMAN_THRESHOLD} is flagged human. The gap between the two
            calibration ranges is where the uncertain band sits.
          </p>
          <dl className="grid grid-cols-2 gap-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <Stat label="AI range" value="0.093–0.225" />
            <Stat label="Human range" value="0.294–0.725" />
          </dl>
        </div>
      </Section>

      <Section
        title="Watermark robustness (A)"
        description="Share of 30 seeded runs still flagged as watermarked as a structural attack strengthens (green-list scheme, δ = 2). These are structural edits, not real paraphrasing."
      >
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Attack</th>
                {WATERMARK_STRENGTHS.map((s) => (
                  <th key={s} className="text-center">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WATERMARK_ROWS.map(([attack, values]) => (
                <tr key={attack}>
                  <td className="font-medium">{attack}</td>
                  {values.map((v, i) => (
                    <HeatCell key={i} value={v} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </PageShell>
  );
}
