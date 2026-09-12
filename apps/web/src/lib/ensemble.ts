/**
 * Module E (ensemble dashboard): combines Module B and Module C's
 * independent AI-probability estimates via inverse-variance weighting —
 * the standard fixed-effect meta-analysis technique (Cochrane Handbook for
 * Systematic Reviews): each estimate is weighted by 1/variance, so a more
 * confident (lower-variance) estimate pulls the combined result toward it
 * more than a less confident one. This never replaces either module's own
 * verdict — both are always shown alongside the combined score, and a
 * flat disagreement between them overrides the math entirely (see
 * `computeEnsemble`). Full reasoning in docs/architecture.md.
 *
 * Module C already reports a real, calibrated interval (its split
 * conformal prediction), so its variance is a genuine converted quantity.
 * Module B has no native per-instance interval, so its variance here is an
 * honestly-labeled heuristic, not a statistically fitted one — see
 * `binocularsToEstimate`.
 */

export interface Estimate {
  p: number; // P(AI), 0..1
  variance: number; // proxy variance on the probability scale
}

export type Verdict = 'likely-ai' | 'likely-human' | 'uncertain';
export type EnsembleVerdict = Verdict | 'disagreement';

// Mirrors app/detectors/perplexity.py's AI_THRESHOLD/HUMAN_THRESHOLD.
const B_AI_THRESHOLD = 0.24;
const B_HUMAN_THRESHOLD = 0.28;

// Mirrors app/classifier/model.py's UNCERTAIN_MARGIN.
const UNCERTAIN_MARGIN = 0.1;

/** Maps Module B's raw binoculars score to a probability + a per-instance
 * confidence proxy. The midpoint of B's own uncertain band is 50/50; the
 * logistic slope is scaled by the band's half-width, so a score right at
 * either threshold lands around 73%/27% and scores further out (matching
 * the real calibration range in docs/benchmark.md, ~0.09-0.73) approach
 * 0%/100%. Variance shrinks as the score moves further from the midpoint
 * — an honest heuristic standing in for a real per-instance interval,
 * which Module B doesn't have (unlike Module C's conformal one below). */
export function binocularsToEstimate(score: number): Estimate {
  const mid = (B_AI_THRESHOLD + B_HUMAN_THRESHOLD) / 2;
  const halfWidth = (B_HUMAN_THRESHOLD - B_AI_THRESHOLD) / 2;
  const distance = Math.abs(score - mid) / halfWidth;
  const z = -(score - mid) / halfWidth;
  const p = 1 / (1 + Math.exp(-z));
  const variance = 1 / (1 + distance * distance);
  return { p, variance };
}

function zForConfidenceLevel(level: number): number {
  // The one artifact this project ships is calibrated at 90% (alpha=0.1);
  // a generic two-sided-95% z is used as a fallback so this doesn't break
  // outright if a differently-calibrated artifact is ever trained instead
  // of properly generalizing via an inverse-normal-CDF.
  if (Math.abs(level - 0.9) < 0.01) return 1.645;
  return 1.96;
}

/** Converts Module C's real conformal interval to a variance via the
 * standard CI-to-SE conversion (half-width / z), the same approach used to
 * pool studies reported as confidence intervals in a fixed-effect
 * meta-analysis. Unlike Module B's heuristic above, this is a real
 * statistical conversion of an already-real interval. */
export function classifierToEstimate(
  aiProbability: number,
  intervalLow: number,
  intervalHigh: number,
  confidenceLevel: number,
): Estimate {
  const halfWidth = (intervalHigh - intervalLow) / 2;
  const z = zForConfidenceLevel(confidenceLevel);
  const se = halfWidth / z;
  return { p: aiProbability, variance: se * se };
}

/** Fixed-effect inverse-variance pooling: `p = Σ(wᵢpᵢ)/Σwᵢ`,
 * `variance = 1/Σwᵢ`, where `wᵢ = 1/varianceᵢ`. */
export function combineInverseVariance(estimates: Estimate[]): Estimate {
  const weights = estimates.map((e) => 1 / e.variance);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const p = estimates.reduce((sum, e, i) => sum + e.p * weights[i]!, 0) / totalWeight;
  return { p, variance: 1 / totalWeight };
}

export function verdictFromProbability(p: number): Verdict {
  if (p > 0.5 + UNCERTAIN_MARGIN) return 'likely-ai';
  if (p < 0.5 - UNCERTAIN_MARGIN) return 'likely-human';
  return 'uncertain';
}

export interface EnsembleInput {
  bVerdict: Verdict;
  bBinocularsScore: number;
  cVerdict: Verdict;
  cAiProbability: number;
  cIntervalLow: number;
  cIntervalHigh: number;
  cConfidenceLevel: number;
}

export interface EnsembleResult {
  probability: number;
  intervalLow: number;
  intervalHigh: number;
  verdict: EnsembleVerdict;
  disagreement: boolean;
}

/** Combines Module B and C into one probability + interval, but a flat
 * contradiction between their own verdicts (one likely-ai, the other
 * likely-human) is reported as "disagreement" outright — no weighted
 * average papers over two detectors actively disagreeing about the same
 * text, which is exactly the situation this dashboard exists to surface
 * rather than hide. */
export function computeEnsemble(input: EnsembleInput): EnsembleResult {
  const bEstimate = binocularsToEstimate(input.bBinocularsScore);
  const cEstimate = classifierToEstimate(
    input.cAiProbability,
    input.cIntervalLow,
    input.cIntervalHigh,
    input.cConfidenceLevel,
  );
  const combined = combineInverseVariance([bEstimate, cEstimate]);
  const se = Math.sqrt(combined.variance);
  const z = zForConfidenceLevel(input.cConfidenceLevel);

  const disagreement =
    (input.bVerdict === 'likely-ai' && input.cVerdict === 'likely-human') ||
    (input.bVerdict === 'likely-human' && input.cVerdict === 'likely-ai');

  return {
    probability: combined.p,
    intervalLow: Math.max(0, combined.p - z * se),
    intervalHigh: Math.min(1, combined.p + z * se),
    verdict: disagreement ? 'disagreement' : verdictFromProbability(combined.p),
    disagreement,
  };
}
