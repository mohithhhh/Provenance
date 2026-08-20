'use client';

import { useState } from 'react';
import { ApiError, detectStatistical, type DetectStatisticalResponse } from '@/lib/api';
import { GltrView } from './GltrView';
import { VerdictCard } from './VerdictCard';

export default function DetectPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<DetectStatisticalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRun() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await detectStatistical(text);
      setResult(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Statistical Detector</h1>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Module B. A zero-shot detector built from two small, real, off-the-shelf language models (
          <code className="font-mono text-xs">gpt2</code> and{' '}
          <code className="font-mono text-xs">distilgpt2</code>) — no training, no dataset, just how
          predictable your text is to them. Inspired by Binoculars (Hans et al., 2024) and GLTR
          (Gehrmann et al., 2019), independently reimplemented at a much smaller scale and
          recalibrated for it (see{' '}
          <a
            href="https://github.com/mohithhhh/Provenance/blob/main/docs/architecture.md"
            className="underline underline-offset-2"
          >
            docs/architecture.md
          </a>
          ). This shares the same base-model blind spot as every detector of its kind; see{' '}
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
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Paste a paragraph or two to analyze"
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 font-mono text-sm dark:border-zinc-700"
        />
        <button
          onClick={handleRun}
          disabled={busy || text.trim().length === 0}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {busy ? 'Analyzing…' : 'Run statistical detector'}
        </button>
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      </section>

      {result && (
        <>
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">Result</h2>
            <VerdictCard
              verdict={result.verdict}
              binocularsScore={result.binocularsScore}
              perplexity={result.perplexity}
              crossPerplexity={result.crossPerplexity}
              top10Fraction={result.top10Fraction}
              burstiness={result.burstiness}
            />
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">Per-token predictability (GLTR)</h2>
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <GltrView tokens={result.tokens} />
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">Per-sentence breakdown</h2>
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 dark:text-zinc-500">
                    <th className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
                      Sentence
                    </th>
                    <th className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
                      Mean surprisal
                    </th>
                    <th className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
                      Top-10 fraction
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.sentences.map((s, i) => (
                    <tr key={i}>
                      <td className="max-w-md px-4 py-2 font-mono">{s.text}</td>
                      <td className="px-4 py-2 font-mono">
                        {s.scored ? s.meanSurprisal.toFixed(2) : '—'}
                      </td>
                      <td className="px-4 py-2 font-mono">
                        {s.scored ? `${(s.topKFraction * 100).toFixed(1)}%` : 'too short'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
