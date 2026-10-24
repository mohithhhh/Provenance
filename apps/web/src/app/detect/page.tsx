'use client';

import { useState } from 'react';
import { ApiError, detectStatistical, type DetectStatisticalResponse } from '@/lib/api';
import { AGREE_TEXT, SPLIT_TEXT } from '@/lib/specimen';
import { DocLink, PageHeader, PageShell, Section } from '../ui';
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
    <PageShell>
      <PageHeader
        letter="B"
        lede="Measures how predictable your text is to two small language models. Machine text tends to be the kind of thing a model would have written next."
      >
        <p>
          A zero-shot detector built from two small, real, off-the-shelf language models (
          <code className="font-mono text-xs">gpt2</code> and{' '}
          <code className="font-mono text-xs">distilgpt2</code>): no training and no dataset, just
          how predictable the text is to them. Inspired by Binoculars (Hans et al., 2024) and GLTR
          (Gehrmann et al., 2019), independently reimplemented at a much smaller scale and
          recalibrated for it. <DocLink doc="architecture.md">Design notes</DocLink>.
        </p>
        <p>
          It shares the same base-model blind spot as every detector of its kind.{' '}
          <DocLink doc="limitations.md">Read the limitations</DocLink>.
        </p>
      </PageHeader>

      <section className="flex flex-col gap-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          aria-label="Text to analyze"
          placeholder="Paste a paragraph or two to analyze"
          className="field"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRun}
            disabled={busy || text.trim().length === 0}
            className="btn btn-primary"
          >
            {busy ? 'Analyzing…' : 'Run statistical detector'}
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
            ? 'Scoring every token with both models. The first run loads them and can take up to a minute.'
            : 'Results appear here: a verdict with its five measurements, every token shaded by how strongly the model predicted it, and a sentence-by-sentence breakdown.'}
        </p>
      )}

      {result && (
        <>
          <Section title="Result">
            <VerdictCard
              verdict={result.verdict}
              binocularsScore={result.binocularsScore}
              perplexity={result.perplexity}
              crossPerplexity={result.crossPerplexity}
              top10Fraction={result.top10Fraction}
              burstiness={result.burstiness}
            />
          </Section>

          <Section
            title="Token by token"
            description="Each token shaded by where it ranked in the model's own predictions (GLTR). Hover a token for its rank."
          >
            <div className="panel">
              <GltrView tokens={result.tokens} />
            </div>
          </Section>

          <Section title="Sentence by sentence">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sentence</th>
                    <th>Mean surprisal</th>
                    <th>Top-10 fraction</th>
                  </tr>
                </thead>
                <tbody>
                  {result.sentences.map((s, i) => (
                    <tr key={i}>
                      <td className="max-w-md">{s.text}</td>
                      <td>{s.scored ? s.meanSurprisal.toFixed(2) : '—'}</td>
                      <td>{s.scored ? `${(s.topKFraction * 100).toFixed(1)}%` : 'too short'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </PageShell>
  );
}
