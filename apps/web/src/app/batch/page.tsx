'use client';

import { useState } from 'react';
import { checkLedger, classifyText, detectStatistical } from '@/lib/api';
import { parseLines, toCsv } from '@/lib/csv';
import { computeEnsemble } from '@/lib/ensemble';
import { Chip, PageHeader, PageShell, Section, VERDICT_LABEL, VERDICT_TONE } from '../ui';

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
    <PageShell wide>
      <PageHeader
        title="Batch mode"
        lede="Run many texts through the statistical detector, the classifier, the ledger and the ensemble in one go, then export everything as CSV."
      >
        <p>
          One text per line. Texts are processed one at a time, because these are real, CPU-bound
          model calls and firing them all at once would only slow every one of them down.
        </p>
      </PageHeader>

      <section className="panel flex flex-col gap-4">
        <label className="label">
          Upload a .txt or one-column .csv
          <input
            type="file"
            accept=".txt,.csv"
            onChange={handleFile}
            className="field-file"
            disabled={busy}
          />
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={6}
          aria-label="Texts to analyze, one per line"
          placeholder={
            'Or paste one text per line, e.g.:\nFirst text to analyze.\nSecond text to analyze.'
          }
          className="field font-mono text-sm"
          disabled={busy}
        />
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleRun}
            disabled={busy || lineCount === 0}
            className="btn btn-primary"
          >
            {busy
              ? 'Analyzing…'
              : lineCount === 0
                ? 'Analyze'
                : `Analyze ${lineCount} text${lineCount === 1 ? '' : 's'}`}
          </button>
          {progress && (
            <div className="flex min-w-48 flex-1 items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-accent-500 transition-[width] duration-300"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
              <span className="text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
                {progress.done} of {progress.total}
              </span>
            </div>
          )}
        </div>
      </section>

      {rows.length === 0 && !busy && (
        <p className="empty">
          Results appear here as a table, one row per text, filling in as each one finishes.
        </p>
      )}

      {rows.length > 0 && (
        <Section
          title="Results"
          action={
            <button
              onClick={() => downloadCsv(rows)}
              disabled={busy}
              className="btn btn-secondary btn-sm"
            >
              Download CSV
            </button>
          }
        >
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Text</th>
                  <th>B, statistical</th>
                  <th>C, classifier</th>
                  <th>F, ledger</th>
                  <th>Ensemble</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="max-w-xs truncate font-mono text-xs" title={r.text}>
                      {r.text}
                    </td>
                    <td>
                      <VerdictCell verdict={r.bVerdict} detail={r.bScore} />
                    </td>
                    <td>
                      <VerdictCell verdict={r.cVerdict} detail={r.cProbability} />
                    </td>
                    <td>
                      <Chip
                        tone={
                          r.fMatch === 'matched'
                            ? 'signal'
                            : r.fMatch === 'error'
                              ? 'alert'
                              : 'neutral'
                        }
                      >
                        {r.fMatch === 'matched'
                          ? 'Matched'
                          : r.fMatch === 'error'
                            ? 'Error'
                            : 'No match'}
                      </Chip>
                    </td>
                    <td>
                      <VerdictCell verdict={r.ensembleVerdict} detail={r.ensembleProbability} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </PageShell>
  );
}

function VerdictCell({ verdict, detail }: { verdict: string; detail: string }) {
  if (!verdict) return <span className="text-zinc-400">—</span>;
  if (verdict === 'error') return <Chip tone="alert">Error</Chip>;
  return (
    <span className="flex flex-col items-start gap-1">
      <Chip tone={VERDICT_TONE[verdict] ?? 'neutral'}>{VERDICT_LABEL[verdict] ?? verdict}</Chip>
      {detail && <span className="text-xs text-zinc-500 dark:text-zinc-400">{detail}</span>}
    </span>
  );
}
