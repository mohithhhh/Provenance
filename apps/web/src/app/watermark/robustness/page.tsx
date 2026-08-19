'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ATTACK_LABELS,
  ATTACK_TYPES,
  runDeltaTradeoffSweep,
  runMultiAttackSweep,
  type AttackType,
  type DeltaTradeoffPoint,
  type RobustnessPoint,
  type Scheme,
} from '@provenance/watermark-core';
import { LineChart, type ChartSeries } from './LineChart';

const STRENGTHS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.75, 1];
const DELTAS = [0, 1, 2, 3, 4, 5, 6, 8];
const Z_THRESHOLD = 4;

const SERIES_COLORS: Record<AttackType, string> = {
  substitute: 'var(--chart-series-1)',
  delete: 'var(--chart-series-2)',
  insert: 'var(--chart-series-3)',
  reorder: 'var(--chart-series-4)',
};

export default function RobustnessLabPage() {
  const [scheme, setScheme] = useState<Scheme>('greenlist');
  const [key, setKey] = useState('demo-key');
  const [gamma, setGamma] = useState(0.5);
  const [delta, setDelta] = useState(2);
  const [length, setLength] = useState(150);

  const [robustness, setRobustness] = useState<Partial<
    Record<AttackType, RobustnessPoint[]>
  > | null>(null);
  const [tradeoff, setTradeoff] = useState<DeltaTradeoffPoint[] | null>(null);

  function handleRunRobustness() {
    const result = runMultiAttackSweep({
      scheme,
      key,
      gamma,
      delta,
      length,
      attacks: [...ATTACK_TYPES],
      strengths: STRENGTHS,
      random: Math.random,
    });
    setRobustness(result);
  }

  function handleRunTradeoff() {
    const result = runDeltaTradeoffSweep({
      key,
      gamma,
      length,
      deltas: DELTAS,
      random: Math.random,
    });
    setTradeoff(result);
  }

  const robustnessSeries: ChartSeries[] = robustness
    ? ATTACK_TYPES.filter((a) => robustness[a]).map((attack) => ({
        label: ATTACK_LABELS[attack],
        color: SERIES_COLORS[attack],
        points: robustness[attack]!.map((p) => ({ x: p.strength, y: p.zScore })),
      }))
    : [];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-3">
        <Link
          href="/watermark"
          className="w-fit text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100"
        >
          ← Watermark Lab
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Robustness Lab</h1>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Two things Module A needs to be honest about: how fast detection degrades under
          perturbation, and what the green-list bias strength (δ) actually costs. The attacks here
          are simple, structural perturbations (same-category word swaps, deletion, insertion, local
          reordering) — not real paraphrasing. A real paraphrase attack (an actual model rewriting
          the text) is expected to be considerably more damaging, and is Module G&apos;s job (Phase
          7), not this page&apos;s.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Setup</h2>
        <div className="flex w-fit gap-1 rounded-full border border-zinc-200 p-1 text-sm dark:border-zinc-800">
          {(['greenlist', 'gumbel'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScheme(s)}
              className={`rounded-full px-3 py-1 transition ${
                scheme === s
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              {s === 'greenlist' ? 'Green-list' : 'Gumbel'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            Key
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Length: {length}
            <input
              type="range"
              min={60}
              max={300}
              step={10}
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
            />
          </label>
          {scheme === 'greenlist' && (
            <>
              <label className="flex flex-col gap-1 text-sm">
                Gamma: {gamma.toFixed(2)}
                <input
                  type="range"
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={gamma}
                  onChange={(e) => setGamma(Number(e.target.value))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Delta (for robustness sweep): {delta.toFixed(1)}
                <input
                  type="range"
                  min={0}
                  max={8}
                  step={0.5}
                  value={delta}
                  onChange={(e) => setDelta(Number(e.target.value))}
                />
              </label>
            </>
          )}
        </div>
      </section>

      {/* Robustness sweep */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Robustness under attack</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Generates one watermarked passage, then applies each attack at increasing strength
          (fraction of words affected) and re-detects. The dashed line is the z = 4 detection
          threshold used elsewhere in this project.
        </p>
        <button
          onClick={handleRunRobustness}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Run robustness sweep
        </button>
        {robustness && (
          <LineChart
            series={robustnessSeries}
            xLabel="Attack strength"
            yLabel="z-score"
            threshold={{ y: Z_THRESHOLD, label: 'detection threshold' }}
            formatX={(x) => `${Math.round(x * 100)}%`}
            formatY={(y) => y.toFixed(1)}
          />
        )}
      </section>

      {/* Delta tradeoff */}
      {scheme === 'greenlist' && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Bias strength (δ) tradeoff</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            For each δ, generates a fresh passage and self-detects it. Green fraction is this
            project&apos;s proxy for distortion: how far the observed green-token rate sits above γ,
            i.e. how hard the bias pushed sampling away from what an unwatermarked model would have
            produced. There is no real fluency/perplexity model behind this toy grammar, so unlike
            the original paper this can&apos;t report an actual text-quality cost — only this
            structural proxy for it.
          </p>
          <button
            onClick={handleRunTradeoff}
            className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Run δ tradeoff sweep
          </button>
          {tradeoff && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Detection strength vs δ
                </h3>
                <LineChart
                  series={[
                    {
                      label: 'z-score',
                      color: 'var(--chart-series-1)',
                      points: tradeoff.map((p) => ({ x: p.delta, y: p.zScore })),
                    },
                  ]}
                  xLabel="δ"
                  yLabel="z-score"
                  threshold={{ y: Z_THRESHOLD, label: 'threshold' }}
                  formatX={(x) => x.toFixed(1)}
                  formatY={(y) => y.toFixed(1)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Distortion proxy (green fraction) vs δ
                </h3>
                <LineChart
                  series={[
                    {
                      label: 'green fraction',
                      color: 'var(--chart-series-2)',
                      points: tradeoff.map((p) => ({ x: p.delta, y: p.greenFraction })),
                    },
                  ]}
                  xLabel="δ"
                  yLabel="green fraction"
                  formatX={(x) => x.toFixed(1)}
                  formatY={(y) => `${Math.round(y * 100)}%`}
                />
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
