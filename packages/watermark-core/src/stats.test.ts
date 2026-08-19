import { describe, expect, it } from 'vitest';
import { normalCdf, pValueFromZ } from './stats.js';

describe('normalCdf', () => {
  it('is 0.5 at z = 0', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
  });

  it('matches known standard-normal table values', () => {
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3);
    expect(normalCdf(4)).toBeCloseTo(0.9999683, 6);
  });

  it('is monotonically increasing', () => {
    expect(normalCdf(-2)).toBeLessThan(normalCdf(-1));
    expect(normalCdf(-1)).toBeLessThan(normalCdf(0));
    expect(normalCdf(0)).toBeLessThan(normalCdf(1));
    expect(normalCdf(1)).toBeLessThan(normalCdf(2));
  });

  it('saturates toward 0 and 1 at the extremes', () => {
    expect(normalCdf(-10)).toBeCloseTo(0, 6);
    expect(normalCdf(10)).toBeCloseTo(1, 6);
  });
});

describe('pValueFromZ', () => {
  it('is the complement of the CDF', () => {
    expect(pValueFromZ(1.5)).toBeCloseTo(1 - normalCdf(1.5), 10);
  });

  it('is ~0.5 at z = 0 and shrinks for large positive z', () => {
    expect(pValueFromZ(0)).toBeCloseTo(0.5, 6);
    expect(pValueFromZ(4)).toBeLessThan(0.0001);
  });
});
