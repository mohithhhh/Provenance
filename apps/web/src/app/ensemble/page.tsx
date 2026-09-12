'use client';

import { useState } from 'react';
import {
  ApiError,
  checkLedger,
  classifyText,
  detectStatistical,
  type DetectSentence,
} from '@/lib/api';
import { computeEnsemble, type EnsembleResult } from '@/lib/ensemble';
import { EnsembleCard } from './EnsembleCard';
import { ModuleResultsTable, type ModuleResultRow } from './ModuleResultsTable';
import { SentenceHeatmap } from './SentenceHeatmap';

function describeErr(reason: unknown): string {
  return reason instanceof ApiError ? reason.message : String(reason);
}

export default function EnsemblePage() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<ModuleResultRow[] | null>(null);
  const [ensemble, setEnsemble] = useState<EnsembleResult | null>(null);
  const [sentences, setSentences] = useState<DetectSentence[] | null>(null);

  async function handleAnalyze() {
    setBusy(true);
    setRows(null);
    setEnsemble(null);
    setSentences(null);
    try {
      const [bResult, cResult, fResult] = await Promise.allSettled([
        detectStatistical(text),
        classifyText(text),
        checkLedger(text),
      ]);

      const newRows: ModuleResultRow[] = [];

      if (bResult.status === 'fulfilled') {
        const b = bResult.value;
        newRows.push({
          module: 'B — Statistical detector',
          value: `${b.binocularsScore.toFixed(3)} (${b.verdict})`,
        });
        setSentences(b.sentences);
      } else {
        newRows.push({
          module: 'B — Statistical detector',
          value: 'error',
          note: describeErr(bResult.reason),
        });
      }

      if (cResult.status === 'fulfilled') {
        const c = cResult.value;
        newRows.push({
          module: 'C — Trained classifier',
          value: `${(c.aiProbability * 100).toFixed(1)}% (${c.verdict})`,
        });
      } else {
        newRows.push({
          module: 'C — Trained classifier',
          value: 'error',
          note: describeErr(cResult.reason),
        });
      }

      if (fResult.status === 'fulfilled') {
        const f = fResult.value;
        newRows.push({
          module: 'F — Retrieval ledger',
          value: f.matched
            ? `matched (${((f.bestMatch?.similarity ?? 0) * 100).toFixed(1)}%)`
            : 'no match',
          note: 'only recognizes text this suite logged before',
        });
      } else {
        newRows.push({
          module: 'F — Retrieval ledger',
          value: 'error',
          note: describeErr(fResult.reason),
        });
      }

      setRows(newRows);

      if (bResult.status === 'fulfilled' && cResult.status === 'fulfilled') {
        setEnsemble(
          computeEnsemble({
            bVerdict: bResult.value.verdict,
            bBinocularsScore: bResult.value.binocularsScore,
            cVerdict: cResult.value.verdict,
            cAiProbability: cResult.value.aiProbability,
            cIntervalLow: cResult.value.intervalLow,
            cIntervalHigh: cResult.value.intervalHigh,
            cConfidenceLevel: cResult.value.confidenceLevel,
          }),
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Ensemble Dashboard</h1>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Module E. One piece of text, run through Modules B, C, and F at once — each module&apos;s
          own result shown as-is, never blended into a single fake-precise number, plus one combined
          estimate computed honestly from the two that actually produce probabilities. Module A
          (needs a known watermark key) and Module D (cryptographic, not statistical) don&apos;t fit
          this kind of combination — see{' '}
          <a
            href="https://github.com/mohithhhh/Provenance/blob/main/docs/architecture.md"
            className="underline underline-offset-2"
          >
            docs/architecture.md
          </a>
          .
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Paste a paragraph or two to analyze"
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 font-mono text-sm dark:border-zinc-700"
        />
        <button
          onClick={handleAnalyze}
          disabled={busy || text.trim().length === 0}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {busy ? 'Analyzing…' : 'Analyze'}
        </button>
      </section>

      {ensemble && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Combined estimate</h2>
          <EnsembleCard
            verdict={ensemble.verdict}
            probability={ensemble.probability}
            intervalLow={ensemble.intervalLow}
            intervalHigh={ensemble.intervalHigh}
            disagreement={ensemble.disagreement}
          />
        </section>
      )}

      {rows && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Each module&apos;s own result</h2>
          <ModuleResultsTable rows={rows} />
        </section>
      )}

      {sentences && sentences.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Per-sentence heatmap</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Reuses Module B&apos;s own per-sentence predictability data as a visual proxy — not a
            trained per-segment classifier. See docs/architecture.md.
          </p>
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <SentenceHeatmap sentences={sentences} />
          </div>
        </section>
      )}
    </main>
  );
}
