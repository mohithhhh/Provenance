import { describe, expect, it } from 'vitest';
import { getGreenSet } from './green-list.js';
import { VOCAB } from './vocab.js';

describe('getGreenSet', () => {
  it('is deterministic for the same key/context/gamma', () => {
    const a = getGreenSet('key', 'the', VOCAB, 0.5);
    const b = getGreenSet('key', 'the', VOCAB, 0.5);
    expect([...a].sort()).toEqual([...b].sort());
  });

  it('changes with the key', () => {
    const a = getGreenSet('key-a', 'the', VOCAB, 0.5);
    const b = getGreenSet('key-b', 'the', VOCAB, 0.5);
    expect([...a].sort()).not.toEqual([...b].sort());
  });

  it('changes with the context', () => {
    const a = getGreenSet('key', 'the', VOCAB, 0.5);
    const b = getGreenSet('key', 'river', VOCAB, 0.5);
    expect([...a].sort()).not.toEqual([...b].sort());
  });

  it('produces a green fraction close to gamma, averaged over many contexts', () => {
    const gamma = 0.3;
    let totalGreen = 0;
    const contexts = 200;
    for (let i = 0; i < contexts; i++) {
      const set = getGreenSet('fixed-key', `context-${i}`, VOCAB, gamma);
      totalGreen += set.size;
    }
    const observedFraction = totalGreen / (contexts * VOCAB.length);
    expect(observedFraction).toBeGreaterThan(gamma - 0.03);
    expect(observedFraction).toBeLessThan(gamma + 0.03);
  });

  it('respects gamma at the boundaries', () => {
    // gamma close to 0: almost nothing green. gamma close to 1: almost everything.
    const low = getGreenSet('key', 'the', VOCAB, 0.01);
    const high = getGreenSet('key', 'the', VOCAB, 0.99);
    expect(low.size).toBeLessThan(high.size);
  });
});
