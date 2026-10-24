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
import { AGREE_TEXT, SPLIT_TEXT } from '@/lib/specimen';
import { DocLink, PageHeader, PageShell, Section } from '../ui';
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
          letter: 'B',
          module: 'Statistical detector',
          verdict: b.verdict,
          value: `Binoculars score ${b.binocularsScore.toFixed(3)}`,
        });
        setSentences(b.sentences);
      } else {
        newRows.push({
          letter: 'B',
          module: 'Statistical detector',
          verdict: 'error',
          value: describeErr(bResult.reason),
        });
      }

      if (cResult.status === 'fulfilled') {
        const c = cResult.value;
        newRows.push({
          letter: 'C',
          module: 'Trained classifier',
          verdict: c.verdict,
          value: `${(c.aiProbability * 100).toFixed(2)}% AI, ${Math.round(c.confidenceLevel * 100)}% interval ${(c.intervalLow * 100).toFixed(0)}–${(c.intervalHigh * 100).toFixed(0)}%`,
        });
      } else {
        newRows.push({
          letter: 'C',
          module: 'Trained classifier',
          verdict: 'error',
          value: describeErr(cResult.reason),
        });
      }

      if (fResult.status === 'fulfilled') {
        const f = fResult.value;
        newRows.push({
          letter: 'F',
          module: 'Retrieval ledger',
          verdict: f.matched ? 'matched' : 'no-match',
          value: f.matched
            ? `Best match ${((f.bestMatch?.similarity ?? 0) * 100).toFixed(1)}% similar`
            : 'Only recognizes text this suite has logged',
        });
      } else {
        newRows.push({
          letter: 'F',
          module: 'Retrieval ledger',
          verdict: 'error',
          value: describeErr(fResult.reason),
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
    <PageShell>
      <PageHeader
        letter="E"
        lede="Run one piece of text through the statistical detector, the trained classifier and the retrieval ledger at once. Each verdict stays visible, and the combined estimate abstains when they contradict each other."
      >
        <p>
          The combined estimate pools only B and C, the two modules that produce probabilities,
          using inverse-variance weighting. F is shown alongside because it answers a different
          question: has this suite seen this text before?
        </p>
        <p>
          Watermarking (A) needs a known key and file provenance (D) checks signatures rather than
          style, so neither fits this kind of combination.{' '}
          <DocLink doc="architecture.md">Read the design notes</DocLink>.
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
            onClick={handleAnalyze}
            disabled={busy || text.trim().length === 0}
            className="btn btn-primary"
          >
            {busy ? 'Analyzing…' : 'Analyze'}
          </button>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">or try</span>
          <button onClick={() => setText(SPLIT_TEXT)} className="btn btn-secondary btn-sm">
            A paragraph they split on
          </button>
          <button onClick={() => setText(AGREE_TEXT)} className="btn btn-secondary btn-sm">
            One they agree on
          </button>
        </div>
      </section>

      {!rows && (
        <p className="empty">
          {busy
            ? 'Running three modules. The first run loads the models and can take up to a minute.'
            : 'Results appear here: a combined estimate, each module’s own verdict, and a sentence-by-sentence heatmap.'}
        </p>
      )}

      {ensemble && (
        <Section title="Combined estimate">
          <EnsembleCard
            verdict={ensemble.verdict}
            probability={ensemble.probability}
            intervalLow={ensemble.intervalLow}
            intervalHigh={ensemble.intervalHigh}
            disagreement={ensemble.disagreement}
          />
        </Section>
      )}

      {rows && (
        <Section title="Each module on its own">
          <ModuleResultsTable rows={rows} />
        </Section>
      )}

      {sentences && sentences.length > 0 && (
        <Section
          title="Sentence by sentence"
          description="Shaded by how predictable each sentence was to Module B. It is a visual guide built from B's own data, not a separate per-sentence classifier."
        >
          <div className="panel">
            <SentenceHeatmap sentences={sentences} />
          </div>
        </Section>
      )}
    </PageShell>
  );
}
