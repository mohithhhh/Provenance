import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../hash.js';
import { detectGumbelText, generateGumbelText } from './gumbel.js';

describe('generateGumbelText', () => {
  it('is fully deterministic given key + grammar randomness (word choice needs no fresh randomness)', () => {
    const a = generateGumbelText({ key: 'k', length: 30, random: mulberry32(42) });
    const b = generateGumbelText({ key: 'k', length: 30, random: mulberry32(42) });
    expect(a.text).toBe(b.text);
  });

  it('produces the requested number of tokens', () => {
    const result = generateGumbelText({ key: 'k', length: 25, random: mulberry32(1) });
    expect(result.tokens).toHaveLength(25);
  });

  it('rejects an empty key', () => {
    expect(() => generateGumbelText({ key: '', random: mulberry32(1) })).toThrow();
  });

  it('changing the key changes the chosen words, not just the grammar path', () => {
    const a = generateGumbelText({ key: 'key-a', length: 60, random: mulberry32(5) });
    const b = generateGumbelText({ key: 'key-b', length: 60, random: mulberry32(5) });
    expect(a.text).not.toBe(b.text);
  });

  it('does not always pick the same word within a category (word choice actually varies by context)', () => {
    const result = generateGumbelText({ key: 'k', length: 300, random: mulberry32(11) });
    const distinctWords = new Set(result.tokens.map((t) => t.word));
    expect(distinctWords.size).toBeGreaterThan(5);
  });
});

describe('detectGumbelText', () => {
  it('flags text generated with the same key as watermarked', () => {
    const generated = generateGumbelText({
      key: 'shared-secret',
      length: 200,
      random: mulberry32(1),
    });
    const result = detectGumbelText(generated.text, { key: 'shared-secret' });
    expect(result.verdict).toBe('watermarked');
    expect(result.zScore).toBeGreaterThan(4);
  });

  it('does not flag the same text when detected with the wrong key', () => {
    const generated = generateGumbelText({
      key: 'shared-secret',
      length: 200,
      random: mulberry32(1),
    });
    const result = detectGumbelText(generated.text, { key: 'a-different-key' });
    expect(result.verdict).not.toBe('watermarked');
  });

  it('returns "insufficient-evidence" for very short text', () => {
    const result = detectGumbelText('the river.', { key: 'k' });
    expect(result.verdict).toBe('insufficient-evidence');
  });

  it('returns "insufficient-evidence" for text with no recognized vocabulary', () => {
    const result = detectGumbelText('xyzzy plugh wibble blorp foobar', { key: 'k' });
    expect(result.totalScored).toBe(0);
    expect(result.verdict).toBe('insufficient-evidence');
  });

  it('is deterministic', () => {
    const generated = generateGumbelText({ key: 'k', length: 60, random: mulberry32(3) });
    const a = detectGumbelText(generated.text, { key: 'k' });
    const b = detectGumbelText(generated.text, { key: 'k' });
    expect(a).toEqual(b);
  });

  it('only counts each repeated (context, token) pair once, however many times it recurs', () => {
    const repeated = 'the river the river the river the river the river the river'.trim();
    const result = detectGumbelText(repeated, { key: 'k' });
    expect(result.totalScored).toBe(3);
    expect(result.verdict).toBe('insufficient-evidence');
  });
});
