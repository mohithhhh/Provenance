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
import { DocLink, PageHeader, PageShell, Section } from '../ui';
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
          letter: 'A',
          module: 'Watermarking',
          before: describeA(text, isWatermarked),
          after: describeA(attacked, isWatermarked),
          note: isWatermarked ? undefined : 'Generate a watermarked sample to test this module',
        },
        { letter: 'B', module: 'Statistical detector', before: bBefore, after: bAfter },
        { letter: 'C', module: 'Trained classifier', before: cBefore, after: cAfter },
        { letter: 'F', module: 'Retrieval ledger', before: fBefore, after: fAfter },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        letter="G"
        lede="Damage a piece of text on purpose, then rerun Modules A, B, C and F on the result. You see which methods hold up and which collapse, instead of taking anyone's word for it."
      >
        <p>
          Synonym substitution, sentence reordering and truncation are simple structural
          perturbations. Paraphrase uses a real local T5 model.
        </p>
        <p>
          In this project&apos;s measurements paraphrase was the <em>least</em> damaging of the
          four. That is a property of this specific small checkpoint, chosen for its size, not a
          refutation of the published result it is based on.{' '}
          <DocLink doc="limitations.md">Read the limitations</DocLink>.
        </p>
      </PageHeader>

      <section className="panel flex flex-col gap-5">
        <textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={5}
          aria-label="Text to attack"
          placeholder="Paste text to attack, or generate a watermarked sample"
          className="field"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={handleGenerateSample} className="btn btn-secondary btn-sm">
            Generate a watermarked sample
          </button>
          {isWatermarked ? (
            <span className="chip tone-signal">Watermarked with key “{DEMO_KEY}”</span>
          ) : (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Needed to test Module A as well
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="label">
            Attack
            <select
              value={attack}
              onChange={(e) => setAttack(e.target.value as AttackKind)}
              className="field"
            >
              {ATTACK_TYPES.map((a) => (
                <option key={a} value={a}>
                  {ATTACK_LABELS[a]}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            <span>
              Strength{' '}
              <span className="font-normal text-zinc-500 tabular-nums">
                {Math.round(strength * 100)}% of the text
              </span>
            </span>
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
          className="btn btn-primary"
        >
          {busy ? 'Running…' : 'Run attack and compare'}
        </button>
        {error && <p className="error-msg">{error}</p>}
      </section>

      {!rows && !error && (
        <p className="empty">
          {busy
            ? 'Attacking the text, then scoring both versions with every module. The paraphrase model loads on first use.'
            : 'Results appear here: the attacked text, and every module’s reading before and after.'}
        </p>
      )}

      {attackedText !== null && (
        <Section title="Attacked text">
          <div className="panel font-mono text-sm leading-6">
            {attackedText || <span className="text-zinc-400 dark:text-zinc-500">(empty)</span>}
          </div>
        </Section>
      )}

      {rows && (
        <Section title="Before and after, module by module">
          <ComparisonTable rows={rows} />
        </Section>
      )}
    </PageShell>
  );
}
