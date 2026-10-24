'use client';

import { useState } from 'react';
import { ApiError, classifyText, type ClassifyResponse } from '@/lib/api';
import { AGREE_TEXT, SPLIT_TEXT } from '@/lib/specimen';
import { DocLink, PageHeader, PageShell, Section } from '../ui';
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
    <PageShell>
      <PageHeader
        letter="C"
        lede="Scores writing style (sentence length, vocabulary range, punctuation, common function words) with a model trained on labelled human and AI answers, and reports a calibrated interval instead of a bare percentage."
      >
        <p>
          A logistic regression over stylometric features, trained on{' '}
          <a href="https://huggingface.co/datasets/Hello-SimpleAI/HC3" className="link">
            HC3
          </a>
          . Unlike Module B, it learned from real labelled data instead of just measuring
          predictability. Its confidence interval is conformal-calibrated.{' '}
          <DocLink doc="architecture.md">Design notes</DocLink>.
        </p>
        <p>
          It was trained on one dataset and generalizes poorly past it: on the Attack Lab&apos;s own
          test set it labels only 7 of 16 texts correctly.{' '}
          <DocLink doc="limitations.md">Read the limitations</DocLink>.
        </p>
      </PageHeader>

      <section className="flex flex-col gap-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          aria-label="Text to classify"
          placeholder="Paste a paragraph or two to classify"
          className="field"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRun}
            disabled={busy || text.trim().length === 0}
            className="btn btn-primary"
          >
            {busy ? 'Classifying…' : 'Run classifier'}
          </button>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">or try</span>
          <button onClick={() => setText(SPLIT_TEXT)} className="btn btn-secondary btn-sm">
            A repetitive human paragraph
          </button>
          <button onClick={() => setText(AGREE_TEXT)} className="btn btn-secondary btn-sm">
            A story paragraph
          </button>
        </div>
        {error && <p className="error-msg">{error}</p>}
      </section>

      {!result && !error && (
        <p className="empty">
          {busy
            ? 'Classifying…'
            : 'Results appear here: a verdict with its calibrated interval, and which style features pushed this text toward human or AI.'}
        </p>
      )}

      {result && (
        <>
          <Section title="Result">
            <VerdictCard
              verdict={result.verdict}
              aiProbability={result.aiProbability}
              intervalLow={result.intervalLow}
              intervalHigh={result.intervalHigh}
              confidenceLevel={result.confidenceLevel}
            />
          </Section>

          <Section
            title="What moved the score"
            description="Each feature's standardized value times its trained weight: a direct breakdown of this prediction, largest effect first."
          >
            <FeatureTable features={result.features} />
          </Section>
        </>
      )}
    </PageShell>
  );
}
