import { mulberry32 } from './hash.js';
import { describe, expect, it } from 'vitest';
import { runDeltaTradeoffSweep, runMultiAttackSweep, runRobustnessSweep } from './analysis.js';

describe('runRobustnessSweep', () => {
  it('strength 0 is the unperturbed baseline, and heavy deletion knocks the z-score down', () => {
    const points = runRobustnessSweep({
      scheme: 'greenlist',
      key: 'k',
      length: 150,
      attack: 'delete',
      strengths: [0, 0.25, 0.5, 0.75, 1],
      random: mulberry32(1),
    });
    expect(points[0]!.verdict).toBe('watermarked');
    expect(points.at(-1)!.zScore).toBeLessThan(points[0]!.zScore);
  });

  it('runs all four attack types without throwing, for both schemes', () => {
    for (const scheme of ['greenlist', 'gumbel'] as const) {
      for (const attack of ['substitute', 'delete', 'insert', 'reorder'] as const) {
        expect(() =>
          runRobustnessSweep({
            scheme,
            key: 'k',
            length: 80,
            attack,
            strengths: [0, 0.5, 1],
            random: mulberry32(2),
          }),
        ).not.toThrow();
      }
    }
  });

  it('is deterministic given the same seed', () => {
    const opts = {
      scheme: 'greenlist' as const,
      key: 'k',
      length: 60,
      attack: 'reorder' as const,
      strengths: [0, 0.5, 1],
    };
    const a = runRobustnessSweep({ ...opts, random: mulberry32(5) });
    const b = runRobustnessSweep({ ...opts, random: mulberry32(5) });
    expect(a).toEqual(b);
  });

  it('returns one point per requested strength', () => {
    const points = runRobustnessSweep({
      scheme: 'greenlist',
      key: 'k',
      length: 60,
      attack: 'substitute',
      strengths: [0, 0.2, 0.4, 0.6, 0.8, 1],
      random: mulberry32(1),
    });
    expect(points).toHaveLength(6);
  });
});

describe('runMultiAttackSweep', () => {
  it('returns a curve per attack, all anchored at the same strength-0 baseline z-score', () => {
    const result = runMultiAttackSweep({
      scheme: 'greenlist',
      key: 'k',
      length: 150,
      attacks: ['substitute', 'delete', 'insert', 'reorder'],
      strengths: [0, 0.5, 1],
      random: mulberry32(1),
    });
    const baselineZ = result.substitute![0]!.zScore;
    for (const attack of ['delete', 'insert', 'reorder'] as const) {
      expect(result[attack]![0]!.zScore).toBe(baselineZ);
    }
  });
});

describe('runDeltaTradeoffSweep', () => {
  it('both green fraction and z-score rise with delta', () => {
    const points = runDeltaTradeoffSweep({
      key: 'k',
      gamma: 0.5,
      length: 150,
      deltas: [0, 4, 8],
      random: mulberry32(1),
    });
    expect(points[2]!.greenFraction).toBeGreaterThan(points[0]!.greenFraction);
    expect(points[2]!.zScore).toBeGreaterThan(points[0]!.zScore);
  });

  it('green fraction at delta 0 is close to gamma (no bias applied)', () => {
    const points = runDeltaTradeoffSweep({
      key: 'k',
      gamma: 0.5,
      length: 300,
      deltas: [0],
      random: mulberry32(7),
    });
    expect(points[0]!.greenFraction).toBeGreaterThan(0.35);
    expect(points[0]!.greenFraction).toBeLessThan(0.65);
  });
});
