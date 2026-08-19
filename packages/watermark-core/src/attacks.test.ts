import { describe, expect, it } from 'vitest';
import {
  applyAttack,
  deleteAttack,
  insertAttack,
  reorderAttack,
  substituteAttack,
} from './attacks.js';
import { mulberry32 } from './hash.js';
import { generateGreenListText } from './schemes/green-list.js';

function sampleWords(): string[] {
  const result = generateGreenListText({ key: 'k', length: 40, random: mulberry32(1) });
  return result.tokens.map((t) => t.word);
}

describe('substituteAttack', () => {
  it('is a no-op at strength 0', () => {
    const words = sampleWords();
    expect(substituteAttack(words, 0, mulberry32(1))).toEqual(words);
  });

  it('changes roughly the requested fraction of eligible words', () => {
    const words = sampleWords();
    const result = substituteAttack(words, 1, mulberry32(2));
    const eligible = words.filter((w) => w !== '.');
    const changed = words.filter((w, i) => w !== '.' && w !== result[i]).length;
    // Every eligible word should change at strength 1 (each has multiple
    // same-category alternatives in this vocabulary).
    expect(changed).toBe(eligible.length);
  });

  it('never changes punctuation', () => {
    const words = ['the', 'river', '.'];
    const result = substituteAttack(words, 1, mulberry32(3));
    expect(result[2]).toBe('.');
  });

  it('replacements stay within the original word’s category', () => {
    const words = ['the', 'river', '.'];
    const result = substituteAttack(words, 1, mulberry32(4));
    // "the" is an ARTICLE; only other articles are "a"/"an".
    expect(['a', 'an', 'the']).toContain(result[0]);
  });

  it('is deterministic given the same seed', () => {
    const words = sampleWords();
    const a = substituteAttack(words, 0.5, mulberry32(9));
    const b = substituteAttack(words, 0.5, mulberry32(9));
    expect(a).toEqual(b);
  });
});

describe('deleteAttack', () => {
  it('is a no-op at strength 0', () => {
    const words = sampleWords();
    expect(deleteAttack(words, 0, mulberry32(1))).toEqual(words);
  });

  it('removes all words at strength 1', () => {
    const words = sampleWords();
    expect(deleteAttack(words, 1, mulberry32(1))).toHaveLength(0);
  });

  it('removes roughly the requested fraction', () => {
    const words = sampleWords();
    const result = deleteAttack(words, 0.5, mulberry32(1));
    expect(result.length).toBe(Math.round(words.length * 0.5));
  });
});

describe('insertAttack', () => {
  it('is a no-op at strength 0', () => {
    const words = sampleWords();
    expect(insertAttack(words, 0, mulberry32(1))).toEqual(words);
  });

  it('grows the word list by roughly the requested fraction', () => {
    const words = sampleWords();
    const result = insertAttack(words, 0.5, mulberry32(1));
    expect(result.length).toBe(words.length + Math.round(words.length * 0.5));
  });

  it('never inserts punctuation', () => {
    const words = sampleWords();
    const result = insertAttack(words, 1, mulberry32(1));
    const inserted = result.length - words.length;
    expect(inserted).toBeGreaterThan(0);
    // Original word count of '.' should be preserved (no new periods added).
    const originalDots = words.filter((w) => w === '.').length;
    const resultDots = result.filter((w) => w === '.').length;
    expect(resultDots).toBe(originalDots);
  });
});

describe('reorderAttack', () => {
  it('is a no-op at strength 0', () => {
    const words = sampleWords();
    expect(reorderAttack(words, 0, mulberry32(1))).toEqual(words);
  });

  it('preserves the exact multiset of words (only reorders)', () => {
    const words = sampleWords();
    const result = reorderAttack(words, 1, mulberry32(1));
    expect([...result].sort()).toEqual([...words].sort());
    expect(result).toHaveLength(words.length);
  });

  it('actually changes the order at strength 1', () => {
    const words = sampleWords();
    const result = reorderAttack(words, 1, mulberry32(1));
    expect(result).not.toEqual(words);
  });

  it('handles trivially short input without throwing', () => {
    expect(reorderAttack([], 1, mulberry32(1))).toEqual([]);
    expect(reorderAttack(['the'], 1, mulberry32(1))).toEqual(['the']);
  });
});

describe('applyAttack', () => {
  it('dispatches to the right attack and no-ops at strength 0 for all types', () => {
    const words = sampleWords();
    for (const type of ['substitute', 'delete', 'insert', 'reorder'] as const) {
      expect(applyAttack(words, type, 0, mulberry32(1))).toEqual(words);
    }
  });
});
