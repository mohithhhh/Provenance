/**
 * Robustness/tradeoff sweep helpers (Phase 2). Pure orchestration over the
 * generate/detect/attack primitives — no UI, so both apps/web and
 * scripts/robustness-benchmark.mjs share the exact same logic that
 * produces docs/benchmark.md's numbers.
 */

import { applyAttack, type AttackType } from './attacks.js';
import { detectGreenListText, generateGreenListText } from './schemes/green-list.js';
import { detectGumbelText, generateGumbelText } from './schemes/gumbel.js';
import { renderTokens } from './text.js';
import type { DetectResult } from './types.js';

export type Scheme = 'greenlist' | 'gumbel';

function generate(
  scheme: Scheme,
  key: string,
  gamma: number,
  delta: number,
  length: number,
  random: () => number,
) {
  return scheme === 'greenlist'
    ? generateGreenListText({ key, gamma, delta, length, random })
    : generateGumbelText({ key, length, random });
}

function detect(scheme: Scheme, text: string, key: string, gamma: number): DetectResult {
  return scheme === 'greenlist'
    ? detectGreenListText(text, { key, gamma })
    : detectGumbelText(text, { key });
}

export interface RobustnessPoint {
  strength: number;
  zScore: number;
  verdict: DetectResult['verdict'];
  totalScored: number;
}

export interface RobustnessSweepOptions {
  scheme: Scheme;
  key: string;
  gamma?: number;
  delta?: number;
  length?: number;
  attack: AttackType;
  strengths: number[];
  random: () => number;
}

function sweepOneAttack(
  scheme: Scheme,
  key: string,
  gamma: number,
  baseWords: string[],
  attack: AttackType,
  strengths: number[],
  random: () => number,
): RobustnessPoint[] {
  return strengths.map((strength) => {
    const perturbedWords = applyAttack(baseWords, attack, strength, random);
    const text = renderTokens(perturbedWords);
    const result = detect(scheme, text, key, gamma);
    return {
      strength,
      zScore: result.zScore,
      verdict: result.verdict,
      totalScored: result.totalScored,
    };
  });
}

/**
 * Generate one watermarked passage, then apply the same attack at
 * increasing strength and re-detect each time — showing how quickly the
 * z-score decays as the text is perturbed. `strength: 0` is always the
 * unperturbed baseline (applyAttack no-ops there), which anchors the curve.
 */
export function runRobustnessSweep(options: RobustnessSweepOptions): RobustnessPoint[] {
  const { scheme, key, gamma = 0.5, delta = 2, length = 120, attack, strengths, random } = options;
  const generated = generate(scheme, key, gamma, delta, length, random);
  const baseWords = generated.tokens.map((t) => t.word);
  return sweepOneAttack(scheme, key, gamma, baseWords, attack, strengths, random);
}

export interface MultiAttackSweepOptions {
  scheme: Scheme;
  key: string;
  gamma?: number;
  delta?: number;
  length?: number;
  attacks: AttackType[];
  strengths: number[];
  random: () => number;
}

/** Same idea as runRobustnessSweep, but runs every requested attack type
 * against the *same* base passage, so the resulting curves are a fair,
 * apples-to-apples comparison of one watermarked text's robustness. */
export function runMultiAttackSweep(
  options: MultiAttackSweepOptions,
): Partial<Record<AttackType, RobustnessPoint[]>> {
  const { scheme, key, gamma = 0.5, delta = 2, length = 120, attacks, strengths, random } = options;
  const generated = generate(scheme, key, gamma, delta, length, random);
  const baseWords = generated.tokens.map((t) => t.word);

  const result: Partial<Record<AttackType, RobustnessPoint[]>> = {};
  for (const attack of attacks) {
    result[attack] = sweepOneAttack(scheme, key, gamma, baseWords, attack, strengths, random);
  }
  return result;
}

export interface DeltaTradeoffPoint {
  delta: number;
  zScore: number;
  /** Fraction of scored tokens that landed green — gamma is the null
   * expectation; how far above gamma this sits is this project's proxy for
   * "how hard the watermark pushed the model off its natural distribution",
   * since the toy grammar has no real fluency/perplexity signal to measure
   * true quality loss against. See docs/architecture.md. */
  greenFraction: number;
}

export interface DeltaTradeoffOptions {
  key: string;
  gamma?: number;
  length?: number;
  deltas: number[];
  random: () => number;
}

/** Green-list only — delta has no meaning for the Gumbel scheme. For each
 * delta, generates a fresh passage and self-detects it. */
export function runDeltaTradeoffSweep(options: DeltaTradeoffOptions): DeltaTradeoffPoint[] {
  const { key, gamma = 0.5, length = 120, deltas, random } = options;
  return deltas.map((delta) => {
    const generated = generateGreenListText({ key, gamma, delta, length, random });
    const result = detectGreenListText(generated.text, { key, gamma });
    const greenFraction = result.totalScored > 0 ? result.greenCount / result.totalScored : 0;
    return { delta, zScore: result.zScore, greenFraction };
  });
}
