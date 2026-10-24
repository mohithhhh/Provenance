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
import { PageHeader, PageShell, Section } from '../../ui';
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
    <PageShell>
      <PageHeader
        letter="A"
        title="Watermark robustness"
        lede="How fast does detection fall apart as the text gets edited, and what does a stronger watermark cost? Both sweeps run in your browser."
      >
        <p>
          The attacks here are simple structural perturbations: same-category word swaps, deletion,
          insertion and local reordering. They are not real paraphrasing. A real paraphrase attack,
          where a model rewrites the text, is expected to be more damaging and is the Attack
          Lab&apos;s job, not this page&apos;s.
        </p>
        <p>
          Seeded, repeatable versions of both sweeps are in the{' '}
          <Link href="/benchmark" className="link">
            benchmark
          </Link>
          .
        </p>
      </PageHeader>

      <Section title="Setup">
        <div className="panel flex flex-col gap-5">
          <div className="segmented" role="group" aria-label="Watermarking scheme">
            {(['greenlist', 'gumbel'] as const).map((s) => (
              <button key={s} aria-pressed={scheme === s} onClick={() => setScheme(s)}>
                {s === 'greenlist' ? 'Green-list' : 'Gumbel'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="label">
              Key
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="field"
              />
            </label>
            <label className="label">
              <span>
                Length{' '}
                <span className="font-normal text-zinc-500 tabular-nums">{length} words</span>
              </span>
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
                <label className="label">
                  <span>
                    Green-list fraction (γ){' '}
                    <span className="font-normal text-zinc-500 tabular-nums">
                      {gamma.toFixed(2)}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={0.1}
                    max={0.9}
                    step={0.05}
                    value={gamma}
                    onChange={(e) => setGamma(Number(e.target.value))}
                  />
                </label>
                <label className="label">
                  <span>
                    Bias strength for the attack sweep (δ){' '}
                    <span className="font-normal text-zinc-500 tabular-nums">
                      {delta.toFixed(1)}
                    </span>
                  </span>
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
        </div>
      </Section>

      <Section
        title="Robustness under attack"
        description={`Generates one watermarked passage, applies each attack at increasing strength (the fraction of words affected) and re-detects. The dashed line is the z = ${Z_THRESHOLD} detection threshold used across this project.`}
        action={
          <button onClick={handleRunRobustness} className="btn btn-primary">
            Run attack sweep
          </button>
        }
      >
        {robustness ? (
          <div className="panel">
            <LineChart
              series={robustnessSeries}
              xLabel="Attack strength"
              yLabel="z-score"
              threshold={{ y: Z_THRESHOLD, label: 'detection threshold' }}
              formatX={(x) => `${Math.round(x * 100)}%`}
              formatY={(y) => y.toFixed(1)}
            />
          </div>
        ) : (
          <p className="empty">The z-score for each of the four attacks will chart here.</p>
        )}
      </Section>

      {scheme === 'greenlist' && (
        <Section
          title="Bias strength (δ) tradeoff"
          description="For each δ, generates a fresh passage and self-detects it. Green fraction stands in for distortion: how far the green-word rate sits above γ, meaning how hard the bias pushed sampling away from unwatermarked text."
          action={
            <button onClick={handleRunTradeoff} className="btn btn-primary">
              Run δ sweep
            </button>
          }
        >
          {tradeoff ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="panel flex flex-col gap-3">
                <h3 className="text-sm font-medium">Detection strength by δ</h3>
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
              <div className="panel flex flex-col gap-3">
                <h3 className="text-sm font-medium">Distortion proxy (green fraction) by δ</h3>
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
          ) : (
            <p className="empty">
              Two charts will appear here: detection strength and distortion, each against δ. The
              toy grammar has no real fluency model, so distortion is a structural proxy, not a
              measured text-quality cost.
            </p>
          )}
        </Section>
      )}
    </PageShell>
  );
}
