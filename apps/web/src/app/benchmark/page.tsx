const TABLE_CLASS = 'min-w-full border-collapse text-left text-sm';
const TH_CLASS = 'border-b border-zinc-200 px-3 py-1.5 dark:border-zinc-800';
const TD_CLASS = 'border-b border-zinc-100 px-3 py-1.5 font-mono dark:border-zinc-900';

function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className={TABLE_CLASS}>
        <thead>
          <tr className="text-xs text-zinc-500 dark:text-zinc-500">
            {headers.map((h) => (
              <th key={h} className={TH_CLASS}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className={TD_CLASS}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BenchmarkPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Benchmark</h1>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Real numbers from this project&apos;s own committed, reproducible benchmark scripts — no
          hand-waved or placeholder metrics. Full methodology, every table, and how to reproduce
          each run: see{' '}
          <a
            href="https://github.com/mohithhhh/Provenance/blob/main/docs/benchmark.md"
            className="underline underline-offset-2"
          >
            docs/benchmark.md
          </a>
          . Honest limitations for every number here:{' '}
          <a
            href="https://github.com/mohithhhh/Provenance/blob/main/docs/limitations.md"
            className="underline underline-offset-2"
          >
            docs/limitations.md
          </a>
          .
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">
          Headline: accuracy under attack (Module G, Attack Lab)
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          n=16 (8 human, 8 gpt2-generated). B and C measure &quot;still correctly labeled human vs.
          AI&quot;; F measures &quot;still retrieved as a match to its own logged original&quot; — a
          different kind of correctness, not directly comparable to B/C&apos;s numbers.
        </p>
        <Table
          headers={['Attack', 'Strength', 'B (statistical)', 'C (classifier)', 'F (retrieval)']}
          rows={[
            ['(none)', '—', '16/16 (100%)', '7/16 (44%)', '16/16 (100%)'],
            ['synonym', '0.3', '15/16 (94%)', '7/16 (44%)', '16/16 (100%)'],
            ['synonym', '0.6', '14/16 (88%)', '7/16 (44%)', '16/16 (100%)'],
            ['reorder', '0.3', '16/16 (100%)', '7/16 (44%)', '16/16 (100%)'],
            ['reorder', '0.6', '15/16 (94%)', '7/16 (44%)', '16/16 (100%)'],
            ['truncate', '0.3', '14/16 (88%)', '7/16 (44%)', '16/16 (100%)'],
            ['truncate', '0.6', '14/16 (88%)', '7/16 (44%)', '9/16 (56%)'],
            ['paraphrase', '—', '16/16 (100%)', '9/16 (56%)', '16/16 (100%)'],
          ]}
        />
        <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-500">
          Notably, the real paraphrase attack turned out to be the <em>least</em> damaging of the
          four here — the opposite of this project&apos;s own stated expectation going in.
          That&apos;s a property of the specific small T5 checkpoint used (picked for its size), not
          a refutation of the published result it&apos;s based on — full reasoning in
          docs/architecture.md.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Module C: trained classifier (Phase 5)</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Held out test split (n=767), trained on HC3 (CC-BY-SA 4.0).
        </p>
        <Table
          headers={['Accuracy', 'Precision', 'Recall', 'F1', 'ROC-AUC']}
          rows={[['0.814', '0.789', '0.867', '0.826', '0.896']]}
        />
        <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-500">
          Conformal calibration (target 90% coverage): measured coverage <strong>91.9%</strong>.
          This describes performance on HC3-distributed text specifically — see the Attack
          Lab&apos;s baseline row above for what happens on a different domain and generator.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Module B: zero-shot statistical detector (Phase 4)</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Binoculars-style score, gpt2 performer / distilgpt2 observer — lower means more
          machine-like.
        </p>
        <Table
          headers={['', 'min', 'max']}
          rows={[
            ['AI (gpt2-generated)', '0.093', '0.225'],
            ['Human (original)', '0.294', '0.725'],
          ]}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Module A: watermarking robustness (Phase 2)</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Fraction of 30 seeded runs still flagged &quot;watermarked&quot; as a structural attack
          strengthens (green-list scheme, δ=2) — not real paraphrasing; see docs/limitations.md.
        </p>
        <Table
          headers={['Attack', '0%', '20%', '40%', '75%', '100%']}
          rows={[
            ['substitute', '100%', '57%', '0%', '0%', '0%'],
            ['delete', '100%', '87%', '40%', '0%', '0%'],
            ['insert', '100%', '100%', '60%', '10%', '3%'],
            ['reorder', '100%', '57%', '27%', '0%', '0%'],
          ]}
        />
      </section>
    </main>
  );
}
