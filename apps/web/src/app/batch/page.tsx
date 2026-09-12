'use client';

import { useState } from 'react';
import { checkLedger, classifyText, detectStatistical } from '@/lib/api';
import { parseLines, toCsv } from '@/lib/csv';
import { computeEnsemble } from '@/lib/ensemble';

interface BatchRow {
  text: string;
  bVerdict: string;
  bScore: string;
  cVerdict: string;
  cProbability: string;
  fMatch: string;
  ensembleVerdict: string;
  ensembleProbability: string;
}

const COLUMNS: (keyof BatchRow)[] = [
  'text',
  'bVerdict',
  'bScore',
  'cVerdict',
  'cProbability',
  'fMatch',
  'ensembleVerdict',
  'ensembleProbability',
];

async function analyzeOne(text: string): Promise<BatchRow> {
  const [b, c, f] = await Promise.allSettled([
    detectStatistical(text),
    classifyText(text),
    checkLedger(text),
  ]);
  const bOk = b.status === 'fulfilled' ? b.value : null;
  const cOk = c.status === 'fulfilled' ? c.value : null;
  const fOk = f.status === 'fulfilled' ? f.value : null;

  const ensemble =
    bOk && cOk
      ? computeEnsemble({
          bVerdict: bOk.verdict,
          bBinocularsScore: bOk.binocularsScore,
          cVerdict: cOk.verdict,
          cAiProbability: cOk.aiProbability,
          cIntervalLow: cOk.intervalLow,
          cIntervalHigh: cOk.intervalHigh,
          cConfidenceLevel: cOk.confidenceLevel,
        })
      : null;

  return {
    text,
    bVerdict: bOk?.verdict ?? 'error',
    bScore: bOk ? bOk.binocularsScore.toFixed(3) : '',
    cVerdict: cOk?.verdict ?? 'error',
    cProbability: cOk ? `${(cOk.aiProbability * 100).toFixed(1)}%` : '',
    fMatch: fOk ? (fOk.matched ? 'matched' : 'no match') : 'error',
    ensembleVerdict: ensemble?.verdict ?? '',
    ensembleProbability: ensemble ? `${(ensemble.probability * 100).toFixed(1)}%` : '',
  };
}

function downloadCsv(rows: BatchRow[]) {
  const csv = toCsv(rows, COLUMNS);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'provenance-batch-results.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function BatchPage() {
  const [input, setInput] = useState('');
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setInput(await file.text());
  }

  async function handleRun() {
    const texts = parseLines(input);
    if (texts.length === 0) return;
    setBusy(true);
    setRows([]);
    setProgress({ done: 0, total: texts.length });
    const results: BatchRow[] = [];
    for (const text of texts) {
      results.push(await analyzeOne(text));
      setRows([...results]);
      setProgress({ done: results.length, total: texts.length });
    }
    setBusy(false);
  }

  const lineCount = parseLines(input).length;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Batch Mode</h1>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Analyze many texts at once through Modules B, C, F, and the ensemble combination (Module
          E) — one text per line, processed one at a time (these are real, CPU-bound model calls,
          not something to fire off all at once). Upload a plain-text or one-column CSV file, or
          paste directly below, then export the results as CSV.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <input
          type="file"
          accept=".txt,.csv"
          onChange={handleFile}
          className="text-sm"
          disabled={busy}
        />
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={6}
          placeholder={'One text per line, e.g.:\nFirst text to analyze.\nSecond text to analyze.'}
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 font-mono text-sm dark:border-zinc-700"
          disabled={busy}
        />
        <div className="flex items-center gap-4">
          <button
            onClick={handleRun}
            disabled={busy || lineCount === 0}
            className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {busy
              ? 'Analyzing…'
              : lineCount === 0
                ? 'Analyze'
                : `Analyze ${lineCount} text${lineCount === 1 ? '' : 's'}`}
          </button>
          {progress && (
            <span className="text-sm text-zinc-500 dark:text-zinc-500">
              {progress.done} / {progress.total}
            </span>
          )}
        </div>
      </section>

      {rows.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Results</h2>
            <button
              onClick={() => downloadCsv(rows)}
              className="text-sm text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Download CSV →
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="text-xs text-zinc-500 dark:text-zinc-500">
                  <th className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">Text</th>
                  <th className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">B</th>
                  <th className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">C</th>
                  <th className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">F</th>
                  <th className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
                    Ensemble
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="max-w-xs truncate px-4 py-2 font-mono" title={r.text}>
                      {r.text}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {r.bScore} ({r.bVerdict})
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {r.cProbability} ({r.cVerdict})
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{r.fMatch}</td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {r.ensembleProbability} ({r.ensembleVerdict})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
