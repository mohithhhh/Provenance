'use client';

import { useState } from 'react';
import { ApiError, classifyText, type ClassifyResponse } from '@/lib/api';
import { FeatureTable } from './FeatureTable';
import { VerdictCard } from './VerdictCard';

export default function ClassifyPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ClassifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRun() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await classifyText(text);
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
        <h1 className="text-2xl font-semibold tracking-tight">Trained Classifier</h1>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Module C. A logistic regression over stylometric features (sentence length, lexical
          diversity, punctuation, function-word frequency), trained on{' '}
          <a
            href="https://huggingface.co/datasets/Hello-SimpleAI/HC3"
            className="underline underline-offset-2"
          >
            HC3
          </a>{' '}
          — unlike Module B, this one learned from real labeled data instead of just measuring
          predictability. Its confidence interval is conformal-calibrated, not a bare percentage;
          see{' '}
          <a
            href="https://github.com/mohithhhh/Provenance/blob/main/docs/architecture.md"
            className="underline underline-offset-2"
          >
            docs/architecture.md
          </a>{' '}
          and{' '}
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
          {busy ? 'Classifying…' : 'Run classifier'}
        </button>
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      </section>

      {result && (
        <>
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">Result</h2>
            <VerdictCard
              verdict={result.verdict}
              aiProbability={result.aiProbability}
              intervalLow={result.intervalLow}
              intervalHigh={result.intervalHigh}
              confidenceLevel={result.confidenceLevel}
            />
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">Feature contributions</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">
              Each feature&apos;s (standardized) value times its trained coefficient — a direct
              decomposition of the model&apos;s logit, sorted by how much it moved this particular
              prediction.
            </p>
            <FeatureTable features={result.features} />
          </section>
        </>
      )}
    </main>
  );
}
