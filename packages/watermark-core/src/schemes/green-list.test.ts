import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../hash.js';
import { detectGreenListText, generateGreenListText } from './green-list.js';

const seededRng = () => mulberry32(1234);

describe('generateGreenListText', () => {
  it('is reproducible given the same seeded random source', () => {
    const a = generateGreenListText({ key: 'k', length: 30, random: mulberry32(42) });
    const b = generateGreenListText({ key: 'k', length: 30, random: mulberry32(42) });
    expect(a.text).toBe(b.text);
  });

  it('produces the requested number of tokens', () => {
    const result = generateGreenListText({ key: 'k', length: 25, random: seededRng() });
    expect(result.tokens).toHaveLength(25);
  });

  it('rejects an empty key', () => {
    expect(() => generateGreenListText({ key: '', random: seededRng() })).toThrow();
  });

  it('rejects gamma outside (0, 1)', () => {
    expect(() => generateGreenListText({ key: 'k', gamma: 0, random: seededRng() })).toThrow();
    expect(() => generateGreenListText({ key: 'k', gamma: 1, random: seededRng() })).toThrow();
  });

  it('a stronger delta pushes the green fraction of generated tokens up', () => {
    const weak = generateGreenListText({
      key: 'k',
      gamma: 0.5,
      delta: 0,
      length: 400,
      random: mulberry32(7),
    });
    const strong = generateGreenListText({
      key: 'k',
      gamma: 0.5,
      delta: 4,
      length: 400,
      random: mulberry32(7),
    });
    const fractionGreen = (r: typeof weak) =>
      r.tokens.filter((t) => t.isGreen).length / r.tokens.length;
    expect(fractionGreen(strong)).toBeGreaterThan(fractionGreen(weak));
  });
});

describe('detectGreenListText', () => {
  it('flags text generated with the same key as watermarked', () => {
    const generated = generateGreenListText({
      key: 'shared-secret',
      length: 200,
      random: mulberry32(1),
    });
    const result = detectGreenListText(generated.text, { key: 'shared-secret' });
    expect(result.verdict).toBe('watermarked');
    expect(result.zScore).toBeGreaterThan(4);
  });

  it('does not flag the same text when detected with the wrong key', () => {
    const generated = generateGreenListText({
      key: 'shared-secret',
      length: 200,
      random: mulberry32(1),
    });
    const result = detectGreenListText(generated.text, { key: 'a-different-key' });
    expect(result.verdict).not.toBe('watermarked');
  });

  it('returns "insufficient-evidence" for very short text', () => {
    const result = detectGreenListText('the river.', { key: 'k' });
    expect(result.verdict).toBe('insufficient-evidence');
  });

  it('returns "insufficient-evidence" for text with no recognized vocabulary', () => {
    const result = detectGreenListText('xyzzy plugh wibble blorp foobar', { key: 'k' });
    expect(result.totalScored).toBe(0);
    expect(result.verdict).toBe('insufficient-evidence');
  });

  it('is deterministic', () => {
    const generated = generateGreenListText({ key: 'k', length: 60, random: mulberry32(3) });
    const a = detectGreenListText(generated.text, { key: 'k' });
    const b = detectGreenListText(generated.text, { key: 'k' });
    expect(a).toEqual(b);
  });

  it('only counts each repeated (context, token) pair once, however many times it recurs', () => {
    // Only 3 distinct (context, token) pairs here — (START, the), (the,
    // river), (river, the) — no matter how many times the phrase repeats.
    // A naive counter would let this "detect" a watermark purely by
    // repetition; deduplication keeps totalScored pinned at 3 regardless.
    const repeated = 'the river the river the river the river the river the river'.trim();
    const result = detectGreenListText(repeated, { key: 'k' });
    expect(result.totalScored).toBe(3);
    expect(result.verdict).toBe('insufficient-evidence');
  });

  it('every recognized token is tagged with a boolean isGreen', () => {
    const generated = generateGreenListText({ key: 'k', length: 30, random: mulberry32(9) });
    const result = detectGreenListText(generated.text, { key: 'k' });
    for (const t of result.tokens) {
      if (t.recognized) {
        expect(typeof t.isGreen).toBe('boolean');
      } else {
        expect(t.isGreen).toBeNull();
      }
    }
  });
});
