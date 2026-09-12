'use client';

import { useState } from 'react';
import { detectGreenListText, generateGreenListText } from '@provenance/watermark-core';
import {
  ApiError,
  applyAttack,
  checkLedger,
  classifyText,
  detectStatistical,
  logToLedger,
  ATTACK_LABELS,
  type AttackKind,
} from '@/lib/api';
import { ComparisonTable, type ComparisonRow } from './ComparisonTable';

// A fixed demo key/gamma/delta so Module A's own detector can meaningfully
// re-check a sample this page generated — arbitrary pasted text has no
// watermark to find, so that row is skipped unless the sample came from
// "Generate watermarked sample" below.
const DEMO_KEY = 'attack-lab-demo';
const DEMO_GAMMA = 0.5;
const DEMO_DELTA = 2;

const ATTACK_TYPES: AttackKind[] = ['synonym', 'reorder', 'truncate', 'paraphrase'];

async function describeB(text: string): Promise<string> {
  try {
    const r = await detectStatistical(text);
    return `${r.binocularsScore.toFixed(3)} (${r.verdict})`;
  } catch (err) {
    return err instanceof ApiError ? `error: ${err.message}` : 'error';
  }
}

async function describeC(text: string): Promise<string> {
  try {
    const r = await classifyText(text);
    return `${(r.aiProbability * 100).toFixed(1)}% (${r.verdict})`;
  } catch (err) {
    return err instanceof ApiError ? `error: ${err.message}` : 'error';
  }
}

function describeA(text: string, isWatermarked: boolean): string {
  if (!isWatermarked) return 'N/A';
  try {
    const r = detectGreenListText(text, { key: DEMO_KEY, gamma: DEMO_GAMMA });
    return `z=${r.zScore.toFixed(2)} (${r.verdict})`;
  } catch (err) {
    return err instanceof Error ? `error: ${err.message}` : 'error';
  }
}

export default function AttackLabPage() {
  const [text, setText] = useState('');
  const [isWatermarked, setIsWatermarked] = useState(false);
  const [attack, setAttack] = useState<AttackKind>('synonym');
  const [strength, setStrength] = useState(0.5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attackedText, setAttackedText] = useState<string | null>(null);
  const [rows, setRows] = useState<ComparisonRow[] | null>(null);

  function handleGenerateSample() {
    const result = generateGreenListText({
      key: DEMO_KEY,
      gamma: DEMO_GAMMA,
      delta: DEMO_DELTA,
      length: 80,
    });
    setText(result.text);
    setIsWatermarked(true);
    setAttackedText(null);
    setRows(null);
  }

  function handleTextChange(value: string) {
    setText(value);
    setIsWatermarked(false);
    setAttackedText(null);
    setRows(null);
  }

  async function handleRun() {
    setBusy(true);
    setError(null);
    setAttackedText(null);
    setRows(null);
    try {
      const { attackedText: attacked } = await applyAttack(text, attack, strength);
      setAttackedText(attacked);

      if (attacked.trim().length === 0) {
        setRows([
          {
            module: 'All modules',
            before: '—',
            after: '—',
            note: 'This attack left no text to analyze (try a lower strength).',
          },
        ]);
        return;
      }

      let fBefore = 'logged';
      let fAfter: string;
      try {
        await logToLedger(text, 'attack-lab');
        const check = await checkLedger(attacked);
        fAfter = check.matched
          ? `matched (${((check.bestMatch?.similarity ?? 0) * 100).toFixed(1)}%)`
          : `no match (best ${((check.bestMatch?.similarity ?? 0) * 100).toFixed(1)}%)`;
      } catch (err) {
        fBefore = 'unavailable';
        fAfter = err instanceof ApiError ? err.message : String(err);
      }

      const [bBefore, bAfter, cBefore, cAfter] = await Promise.all([
        describeB(text),
        describeB(attacked),
        describeC(text),
        describeC(attacked),
      ]);

      setRows([
        {
          module: 'A — Watermarking',
          before: describeA(text, isWatermarked),
          after: describeA(attacked, isWatermarked),
          note: isWatermarked ? undefined : 'generate a sample below to test this module',
        },
        { module: 'B — Statistical detector', before: bBefore, after: bAfter },
        { module: 'C — Trained classifier', before: cBefore, after: cAfter },
        { module: 'F — Retrieval ledger', before: fBefore, after: fAfter },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Attack Lab</h1>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Module G. Apply one attack to a piece of text, then run it through Modules A, B, C, and F
          simultaneously to see which survive and which collapse — proof instead of a marketing
          claim. Synonym substitution, sentence reordering, and truncation are simple structural
          perturbations; paraphrase uses a real local T5 model — measured here as the <em>least</em>{' '}
          damaging of the four, a property of this specific small, disk-conscious checkpoint rather
          than a refutation of the published result it&apos;s based on. See{' '}
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
          onChange={(e) => handleTextChange(e.target.value)}
          rows={5}
          placeholder="Paste text to attack, or generate a watermarked sample below"
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 font-mono text-sm dark:border-zinc-700"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleGenerateSample}
            className="w-fit text-sm text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Generate watermarked sample (tests Module A too) →
          </button>
          {isWatermarked && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              Watermarked with key &quot;{DEMO_KEY}&quot;
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Attack type
            <select
              value={attack}
              onChange={(e) => setAttack(e.target.value as AttackKind)}
              className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            >
              {ATTACK_TYPES.map((a) => (
                <option key={a} value={a}>
                  {ATTACK_LABELS[a]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Strength: {strength.toFixed(2)}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={strength}
              onChange={(e) => setStrength(Number(e.target.value))}
            />
          </label>
        </div>

        <button
          onClick={handleRun}
          disabled={busy || text.trim().length === 0}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {busy ? 'Running…' : 'Run attack & compare'}
        </button>
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      </section>

      {attackedText && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Attacked text</h2>
          <div className="rounded-lg border border-zinc-200 p-4 font-mono text-sm dark:border-zinc-800">
            {attackedText || <span className="text-zinc-400 dark:text-zinc-600">(empty)</span>}
          </div>
        </section>
      )}

      {rows && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Before / after, across every module</h2>
          <ComparisonTable rows={rows} />
        </section>
      )}
    </main>
  );
}
