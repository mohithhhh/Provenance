/**
 * Gumbel-max / exponential-minimum-sampling watermark (the scheme
 * popularized by Scott Aaronson's OpenAI watermarking work, and formalized
 * in Kuditipudi, Thickstun, Hashimoto, Liang — "Robust Distortion-free
 * Watermarks for Language Models", 2023, and Aaronson & Kirchner's earlier
 * exponential-minimum-sampling scheme).
 *
 * Instead of biasing logits (green-list scheme), this scheme replaces
 * *sampling* itself: for each candidate token w, derive a pseudorandom
 * value r_w in [0, 1) deterministically from (key, context, w). Pick the
 * token maximizing r_w^(1/p_w) — the Gumbel-max trick — where p_w is the
 * model's probability for that token. Given the same key and context,
 * that's the same token every time, but to anyone without the key it looks
 * like an ordinary sample from the model's distribution (this scheme is
 * "distortion-free": with fresh randomness it reproduces the model's true
 * distribution exactly, unlike the green-list scheme's logit bias).
 *
 * Since this toy grammar assigns a uniform base probability across whatever
 * category's candidate words are in play (p_w = 1/|candidates| for every
 * candidate), the exponent 1/p_w = |candidates| is the same for every
 * candidate, so argmax_w r_w^(1/p_w) collapses to simply argmax_w r_w. That
 * simplification is noted here rather than left implicit, since it's easy
 * to mistake for a bug.
 *
 * Detection: recompute r for the *actual* token chosen at each position.
 * Under the null (unwatermarked text, r independent of the token), r is
 * uniform(0,1), so -ln(1 - r) ~ Exponential(1) (mean 1, variance 1). Under
 * the watermark, tokens are chosen to have anomalously high r, so the sum
 * of -ln(1 - r) across a text runs higher than its null expectation — the
 * detector z-tests that sum against Gamma(T, 1)'s mean/variance (T, T),
 * using a normal approximation valid for the token counts a short passage
 * will have.
 */

import { hashToUnitInterval } from '../hash.js';
import { pValueFromZ } from '../stats.js';
import { candidatesForCategory, renderTokens, sampleNextCategory, tokenize } from '../text.js';
import type {
  DetectResult,
  DetectedToken,
  GenerateResult,
  GeneratedToken,
  PosCategory,
} from '../types.js';
import { findVocabWord } from '../vocab.js';
import { START_CONTEXT } from '../green-list.js';

const DEFAULT_LENGTH = 40;
const DEFAULT_Z_THRESHOLD = 4.0;
const MIN_SCORED_TOKENS = 10;
/** Clamp r away from 1 so -ln(1 - r) never blows up to +Infinity. */
const MAX_R = 1 - 1e-9;

function rFor(key: string, context: string, wordId: number): number {
  return hashToUnitInterval(`${key}|${context}|${wordId}`);
}

export interface GumbelGenerateOptions {
  key: string;
  length?: number;
  /** Randomness for the (watermark-irrelevant) grammar/category walk. Word
   * choice itself is fully deterministic given key + context. */
  random?: () => number;
}

export function generateGumbelText(options: GumbelGenerateOptions): GenerateResult {
  const { key, length = DEFAULT_LENGTH, random = Math.random } = options;
  if (!key) throw new Error('generateGumbelText: key is required');
  if (length <= 0) throw new Error('generateGumbelText: length must be positive');

  const tokens: GeneratedToken[] = [];
  let category: PosCategory = 'START';
  let context = START_CONTEXT;

  for (let i = 0; i < length; i++) {
    const nextCategory = sampleNextCategory(category, random);
    const candidates = candidatesForCategory(nextCategory);

    let best = candidates[0]!;
    let bestR = rFor(key, context, best.id);
    for (const candidate of candidates.slice(1)) {
      const r = rFor(key, context, candidate.id);
      if (r > bestR) {
        best = candidate;
        bestR = r;
      }
    }

    // "isGreen" here means "this is the token the watermark's own selection
    // rule would pick" — reusing the same field as the green-list scheme so
    // the UI can highlight both schemes' output the same way.
    tokens.push({ word: best.text, isGreen: true });
    context = best.text;
    category = nextCategory;
  }

  return { text: renderTokens(tokens.map((t) => t.word)), tokens };
}

export interface GumbelDetectOptions {
  key: string;
  zThreshold?: number;
}

export function detectGumbelText(text: string, options: GumbelDetectOptions): DetectResult {
  const { key, zThreshold = DEFAULT_Z_THRESHOLD } = options;
  if (!key) throw new Error('detectGumbelText: key is required');

  const words = tokenize(text);
  const detected: DetectedToken[] = [];
  const seenPairs = new Set<string>();
  let statSum = 0;
  let scored = 0;
  let prevWord = START_CONTEXT;

  for (const w of words) {
    const vocabWord = findVocabWord(w);
    let scoredHigh: boolean | null = null;
    let counted = false;
    if (vocabWord) {
      const r = Math.min(rFor(key, prevWord, vocabWord.id), MAX_R);
      // Flag tokens whose r exceeds 0.5 as "above the median for their
      // position" — a readable per-token highlight, not itself the test.
      scoredHigh = r > 0.5;
      const pairKey = `${prevWord}|${vocabWord.id}`;
      if (!seenPairs.has(pairKey)) {
        seenPairs.add(pairKey);
        counted = true;
        statSum += -Math.log(1 - r);
        scored++;
      }
    }
    detected.push({ word: w, recognized: !!vocabWord, isGreen: scoredHigh, counted });
    prevWord = w;
  }

  let zScore = 0;
  let pValue = 1;
  let verdict: DetectResult['verdict'] = 'insufficient-evidence';

  if (scored >= MIN_SCORED_TOKENS) {
    // Gamma(scored, 1) has mean = scored, variance = scored.
    zScore = (statSum - scored) / Math.sqrt(scored);
    pValue = pValueFromZ(zScore);
    verdict = zScore > zThreshold ? 'watermarked' : 'human';
  }

  return {
    greenCount: detected.filter((t) => t.counted && t.isGreen).length,
    totalScored: scored,
    totalTokens: words.length,
    zScore,
    pValue,
    verdict,
    tokens: detected,
  };
}
