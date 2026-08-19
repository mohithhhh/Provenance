import { describe, expect, it } from 'vitest';
import { cyrb53, hashToUnitInterval, mulberry32, seededRandom } from './hash.js';

describe('cyrb53', () => {
  it('is deterministic', () => {
    expect(cyrb53('hello')).toBe(cyrb53('hello'));
  });

  it('is sensitive to small input changes (avalanche)', () => {
    expect(cyrb53('hello')).not.toBe(cyrb53('hellp'));
  });

  it('is sensitive to the seed', () => {
    expect(cyrb53('hello', 0)).not.toBe(cyrb53('hello', 1));
  });
});

describe('hashToUnitInterval', () => {
  it('always returns a value in [0, 1)', () => {
    for (const s of ['a', 'b', 'the river', 'key|context|42', '']) {
      const u = hashToUnitInterval(s);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
  });

  it('is roughly uniform over many inputs (not a smooth/periodic function)', () => {
    const buckets = new Array(10).fill(0);
    const n = 5000;
    for (let i = 0; i < n; i++) {
      const u = hashToUnitInterval(`item-${i}`);
      buckets[Math.min(9, Math.floor(u * 10))]++;
    }
    // Each decile should hold roughly n/10 = 500; allow generous slack.
    for (const count of buckets) {
      expect(count).toBeGreaterThan(300);
      expect(count).toBeLessThan(700);
    }
  });
});

describe('mulberry32', () => {
  it('is deterministic given the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1)();
    const b = mulberry32(2)();
    expect(a).not.toBe(b);
  });

  it('stays within [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('seededRandom', () => {
  it('is deterministic given the same seed string', () => {
    const rngA = seededRandom('my-key');
    const rngB = seededRandom('my-key');
    const seqA = Array.from({ length: 5 }, () => rngA());
    const seqB = Array.from({ length: 5 }, () => rngB());
    expect(seqA).toEqual(seqB);
  });
});
