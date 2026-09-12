import { describe, expect, it } from 'vitest';
import {
  binocularsToEstimate,
  classifierToEstimate,
  combineInverseVariance,
  computeEnsemble,
  verdictFromProbability,
} from './ensemble';

describe('binocularsToEstimate', () => {
  it('scores exactly at the midpoint of the uncertain band as 50/50, max variance', () => {
    // mid = (0.24 + 0.28) / 2 = 0.26
    const { p, variance } = binocularsToEstimate(0.26);
    expect(p).toBeCloseTo(0.5, 6);
    expect(variance).toBeCloseTo(1, 6);
  });

  it('scores at the AI-threshold edge as clearly AI-leaning with lower variance', () => {
    const { p, variance } = binocularsToEstimate(0.24);
    expect(p).toBeCloseTo(0.7311, 4);
    expect(variance).toBeCloseTo(0.5, 6);
  });

  it('a score deep in AI territory is near-certain, with low variance', () => {
    const { p, variance } = binocularsToEstimate(0.15);
    expect(p).toBeCloseTo(0.99592, 4);
    expect(variance).toBeCloseTo(0.032, 3);
  });

  it('a score deep in human territory is near-zero', () => {
    const { p } = binocularsToEstimate(0.5);
    expect(p).toBeLessThan(0.01);
  });
});

describe('classifierToEstimate', () => {
  it('converts a real conformal interval to a variance via the 90% z-score', () => {
    const { p, variance } = classifierToEstimate(0.7, 0.2, 0.9, 0.9);
    expect(p).toBe(0.7);
    expect(variance).toBeCloseTo(0.0453, 3);
  });

  it('a narrower interval gives a smaller variance than a wider one at the same p', () => {
    const narrow = classifierToEstimate(0.6, 0.5, 0.7, 0.9);
    const wide = classifierToEstimate(0.6, 0.1, 1.0, 0.9);
    expect(narrow.variance).toBeLessThan(wide.variance);
  });
});

describe('combineInverseVariance', () => {
  it('weights a lower-variance (more confident) estimate more heavily', () => {
    const confident = { p: 0.5, variance: 1 };
    const veryConfident = { p: 0.7, variance: 0.045274 };
    const { p, variance } = combineInverseVariance([confident, veryConfident]);
    expect(p).toBeCloseTo(0.6914, 3);
    expect(variance).toBeCloseTo(0.0433, 3);
  });

  it('two equally confident, opposite estimates average to the midpoint', () => {
    const { p } = combineInverseVariance([
      { p: 0.2, variance: 0.1 },
      { p: 0.8, variance: 0.1 },
    ]);
    expect(p).toBeCloseTo(0.5, 6);
  });
});

describe('verdictFromProbability', () => {
  it('classifies confidently high probabilities as likely-ai', () => {
    expect(verdictFromProbability(0.8)).toBe('likely-ai');
  });

  it('classifies confidently low probabilities as likely-human', () => {
    expect(verdictFromProbability(0.2)).toBe('likely-human');
  });

  it('classifies near-0.5 probabilities as uncertain', () => {
    expect(verdictFromProbability(0.5)).toBe('uncertain');
    expect(verdictFromProbability(0.55)).toBe('uncertain');
  });
});

describe('computeEnsemble', () => {
  const base = {
    bVerdict: 'likely-ai' as const,
    bBinocularsScore: 0.15,
    cVerdict: 'likely-ai' as const,
    cAiProbability: 0.8,
    cIntervalLow: 0.1,
    cIntervalHigh: 1.0,
    cConfidenceLevel: 0.9,
  };

  it('agreeing modules produce a confident combined verdict, not a disagreement', () => {
    const result = computeEnsemble(base);
    expect(result.disagreement).toBe(false);
    expect(result.verdict).toBe('likely-ai');
  });

  it('flatly opposite verdicts are flagged as disagreement, overriding the math', () => {
    const result = computeEnsemble({
      ...base,
      bVerdict: 'likely-ai',
      cVerdict: 'likely-human',
    });
    expect(result.disagreement).toBe(true);
    expect(result.verdict).toBe('disagreement');
  });

  it('one module being merely uncertain is not treated as disagreement', () => {
    const result = computeEnsemble({ ...base, cVerdict: 'uncertain' });
    expect(result.disagreement).toBe(false);
  });

  it('the combined interval always contains the combined probability', () => {
    const result = computeEnsemble(base);
    expect(result.intervalLow).toBeLessThanOrEqual(result.probability);
    expect(result.intervalHigh).toBeGreaterThanOrEqual(result.probability);
  });
});
