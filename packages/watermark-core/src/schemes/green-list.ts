/**
 * Green-list / red-list watermarking (Kirchenbauer, Geiping, Wen, Katz,
 * Miers, Goldstein — "A Watermark for Large Language Models", 2023).
 *
 * At each generation step, the vocabulary is split into a green list
 * (fraction `gamma`) and red list, deterministically from a secret `key`
 * and the previous token. Green-list token logits get a `+delta` boost
 * before sampling, so a watermarked model favors green tokens without
 * making them the *only* option (unlike a hard green-only constraint, which
 * would tank fluency and be trivially detectable structurally). Detection
 * counts how many tokens in a text fall in their position's green list and
 * runs a one-proportion z-test against the null "green tokens appear at
 * their natural rate gamma".
 *
 * This is an original, independent implementation of the published
 * algorithm for education/research — see the disclaimers in the root
 * README. It has no relationship to, and cannot detect, any vendor's real
 * production watermark.
 */

import { getGreenSet, START_CONTEXT } from '../green-list.js';
import { pValueFromZ } from '../stats.js';
import {
  candidatesForCategory,
  renderTokens,
  sampleNextCategory,
  tokenize,
  weightedSample,
} from '../text.js';
import type {
  DetectResult,
  DetectedToken,
  GenerateResult,
  GeneratedToken,
  PosCategory,
} from '../types.js';
import { VOCAB, findVocabWord } from '../vocab.js';

const DEFAULT_GAMMA = 0.5;
const DEFAULT_DELTA = 2.0;
const DEFAULT_LENGTH = 40;
const DEFAULT_Z_THRESHOLD = 4.0;
/** Below this many scored (recognized) tokens, the z-test isn't reliable
 * enough to call — matches the literature's guidance that short texts
 * can't be watermark-detected with confidence. */
const MIN_SCORED_TOKENS = 10;

export interface GreenListGenerateOptions {
  /** Secret key shared between generator and detector. Required — using a
   * fixed default key would make every "watermarked" text in this demo
   * trivially attributable to anyone else who ran the demo. */
  key: string;
  /** Fraction of the vocabulary that is "green" at each step. Default 0.5. */
  gamma?: number;
  /** Logit boost applied to green tokens before sampling. Default 2.0. Higher
   * = stronger, more detectable watermark, at a bigger cost to fluency (this
   * tradeoff is measured properly in Phase 2). */
  delta?: number;
  /** Number of words to generate. Default 40. */
  length?: number;
  /** Injectable randomness source for the (non-watermark-relevant) sampling
   * step, so tests can be deterministic. Defaults to Math.random. */
  random?: () => number;
}

export function generateGreenListText(options: GreenListGenerateOptions): GenerateResult {
  const {
    key,
    gamma = DEFAULT_GAMMA,
    delta = DEFAULT_DELTA,
    length = DEFAULT_LENGTH,
    random = Math.random,
  } = options;

  if (!key) throw new Error('generateGreenListText: key is required');
  if (gamma <= 0 || gamma >= 1) throw new Error('generateGreenListText: gamma must be in (0, 1)');
  if (length <= 0) throw new Error('generateGreenListText: length must be positive');

  const tokens: GeneratedToken[] = [];
  let category: PosCategory = 'START';
  let context = START_CONTEXT;

  for (let i = 0; i < length; i++) {
    const nextCategory = sampleNextCategory(category, random);
    const candidates = candidatesForCategory(nextCategory);
    const greenSet = getGreenSet(key, context, VOCAB, gamma);
    const weights = candidates.map((w) => (greenSet.has(w.id) ? Math.exp(delta) : 1));
    const chosen = weightedSample(candidates, weights, random);

    tokens.push({ word: chosen.text, isGreen: greenSet.has(chosen.id) });
    context = chosen.text;
    category = nextCategory;
  }

  return { text: renderTokens(tokens.map((t) => t.word)), tokens };
}

export interface GreenListDetectOptions {
  key: string;
  gamma?: number;
  /** z-score above which the verdict is "watermarked". Default 4.0, matching
   * the original paper's guidance for a very low false-positive rate. */
  zThreshold?: number;
}

export function detectGreenListText(text: string, options: GreenListDetectOptions): DetectResult {
  const { key, gamma = DEFAULT_GAMMA, zThreshold = DEFAULT_Z_THRESHOLD } = options;
  if (!key) throw new Error('detectGreenListText: key is required');

  const words = tokenize(text);
  const detected: DetectedToken[] = [];
  const seenPairs = new Set<string>();
  let greenCount = 0;
  let scored = 0;
  let prevWord = START_CONTEXT;

  for (const w of words) {
    const vocabWord = findVocabWord(w);
    let isGreen: boolean | null = null;
    let counted = false;
    if (vocabWord) {
      const greenSet = getGreenSet(key, prevWord, VOCAB, gamma);
      isGreen = greenSet.has(vocabWord.id);
      const pairKey = `${prevWord}|${vocabWord.id}`;
      if (!seenPairs.has(pairKey)) {
        seenPairs.add(pairKey);
        counted = true;
        if (isGreen) greenCount++;
        scored++;
      }
    }
    detected.push({ word: w, recognized: !!vocabWord, isGreen, counted });
    prevWord = w;
  }

  let zScore = 0;
  let pValue = 1;
  let verdict: DetectResult['verdict'] = 'insufficient-evidence';

  if (scored >= MIN_SCORED_TOKENS) {
    const variance = scored * gamma * (1 - gamma);
    zScore = (greenCount - gamma * scored) / Math.sqrt(variance);
    pValue = pValueFromZ(zScore);
    verdict = zScore > zThreshold ? 'watermarked' : 'human';
  }

  return {
    greenCount,
    totalScored: scored,
    totalTokens: words.length,
    zScore,
    pValue,
    verdict,
    tokens: detected,
  };
}
