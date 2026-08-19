#!/usr/bin/env node
/**
 * Produces the numbers in docs/benchmark.md's "Module A" section. Run
 * against the *built* package (`npm run build` first) so this script uses
 * exactly the same code the app ships, not a separate reimplementation.
 *
 * Usage: node packages/watermark-core/scripts/robustness-benchmark.mjs
 *
 * Every run here uses a seeded PRNG (mulberry32), so the printed numbers
 * are exactly reproducible — not a one-off screenshot.
 */

import {
  ATTACK_TYPES,
  mulberry32,
  runDeltaTradeoffSweep,
  runMultiAttackSweep,
} from '../dist/index.js';

const SCHEME = 'greenlist';
const KEY = 'benchmark-key';
const GAMMA = 0.5;
const DELTA = 2;
const LENGTH = 150;
const STRENGTHS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.75, 1];
const DELTAS = [0, 1, 2, 3, 4, 5, 6, 8];
const RUNS = 30;
const Z_THRESHOLD = 4;

function mean(xs) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function runRobustnessBenchmark() {
  // seed -> attack -> strength index -> zScore
  const byAttack = Object.fromEntries(ATTACK_TYPES.map((a) => [a, STRENGTHS.map(() => [])]));

  for (let seed = 1; seed <= RUNS; seed++) {
    const result = runMultiAttackSweep({
      scheme: SCHEME,
      key: KEY,
      gamma: GAMMA,
      delta: DELTA,
      length: LENGTH,
      attacks: ATTACK_TYPES,
      strengths: STRENGTHS,
      random: mulberry32(seed),
    });
    for (const attack of ATTACK_TYPES) {
      result[attack].forEach((point, i) => byAttack[attack][i].push(point.zScore));
    }
  }

  console.log(`## Robustness — mean z-score over ${RUNS} seeded runs`);
  console.log();
  console.log(`Scheme: green-list, key: "${KEY}", γ=${GAMMA}, δ=${DELTA}, length=${LENGTH} words.`);
  console.log(`Detection threshold: z > ${Z_THRESHOLD}.`);
  console.log();
  const header = ['Attack', ...STRENGTHS.map((s) => `${Math.round(s * 100)}%`)];
  console.log(`| ${header.join(' | ')} |`);
  console.log(`| ${header.map(() => '---').join(' | ')} |`);
  for (const attack of ATTACK_TYPES) {
    const row = [attack, ...byAttack[attack].map((zs) => mean(zs).toFixed(2))];
    console.log(`| ${row.join(' | ')} |`);
  }
  console.log();

  console.log(`### Fraction of ${RUNS} runs still flagged "watermarked" at each strength`);
  console.log();
  console.log(`| ${header.join(' | ')} |`);
  console.log(`| ${header.map(() => '---').join(' | ')} |`);
  for (const attack of ATTACK_TYPES) {
    const row = [
      attack,
      ...byAttack[attack].map(
        (zs) => `${Math.round((100 * zs.filter((z) => z > Z_THRESHOLD).length) / zs.length)}%`,
      ),
    ];
    console.log(`| ${row.join(' | ')} |`);
  }
  console.log();
}

function runDeltaTradeoffBenchmark() {
  const byDelta = DELTAS.map(() => ({ z: [], green: [] }));

  for (let seed = 1; seed <= RUNS; seed++) {
    const points = runDeltaTradeoffSweep({
      key: KEY,
      gamma: GAMMA,
      length: LENGTH,
      deltas: DELTAS,
      random: mulberry32(seed),
    });
    points.forEach((p, i) => {
      byDelta[i].z.push(p.zScore);
      byDelta[i].green.push(p.greenFraction);
    });
  }

  console.log(
    `## δ tradeoff — mean over ${RUNS} seeded runs (green-list, γ=${GAMMA}, length=${LENGTH})`,
  );
  console.log();
  console.log(`| δ | mean z-score | mean green fraction |`);
  console.log(`| --- | --- | --- |`);
  DELTAS.forEach((delta, i) => {
    console.log(
      `| ${delta} | ${mean(byDelta[i].z).toFixed(2)} | ${(mean(byDelta[i].green) * 100).toFixed(1)}% |`,
    );
  });
  console.log();
}

runRobustnessBenchmark();
runDeltaTradeoffBenchmark();
