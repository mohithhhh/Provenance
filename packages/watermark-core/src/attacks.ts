/**
 * Simple, self-contained text perturbations for testing watermark
 * robustness. These are naive, structural analogs of real attacks — a
 * random same-category word swap standing in for a synonym substitution
 * attack, plain deletion/insertion/local-reordering standing in for
 * editing noise — not real paraphrasing. A real paraphrase attack (an
 * actual LLM rewriting the text) is Module G's job (Phase 7), and is
 * expected to be considerably more damaging to all of these detectors
 * than anything here; see docs/limitations.md.
 */

import type { PosCategory, VocabWord } from './types.js';
import { VOCAB, findVocabWord, wordsInCategory } from './vocab.js';

export type AttackType = 'substitute' | 'delete' | 'insert' | 'reorder';

export const ATTACK_TYPES: AttackType[] = ['substitute', 'delete', 'insert', 'reorder'];

export const ATTACK_LABELS: Record<AttackType, string> = {
  substitute: 'Word substitution',
  delete: 'Word deletion',
  insert: 'Word insertion',
  reorder: 'Local reordering',
};

/** Fisher-Yates partial shuffle: pick `count` distinct indices in [0, n). */
function sampleIndicesWithoutReplacement(n: number, count: number, random: () => number): number[] {
  const indices = Array.from({ length: n }, (_, i) => i);
  const k = Math.max(0, Math.min(count, n));
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(random() * (n - i));
    const tmp = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = tmp;
  }
  return indices.slice(0, k);
}

/**
 * Replace a `strength` fraction of recognized, non-punctuation words with a
 * different random word from the same POS category — grammatically inert
 * (a noun is still a noun), but changes which token occupies that context
 * position, and shifts the context for whatever follows it.
 */
export function substituteAttack(
  words: string[],
  strength: number,
  random: () => number,
): string[] {
  const result = [...words];
  const eligible: number[] = [];
  for (let i = 0; i < words.length; i++) {
    const vw = findVocabWord(words[i]!);
    if (vw && vw.category !== 'PUNCTUATION') eligible.push(i);
  }
  const count = Math.round(strength * eligible.length);
  const chosenPositions = sampleIndicesWithoutReplacement(eligible.length, count, random).map(
    (i) => eligible[i]!,
  );

  for (const idx of chosenPositions) {
    const vw = findVocabWord(result[idx]!)!;
    const alternatives = wordsInCategory(vw.category).filter((w) => w.id !== vw.id);
    if (alternatives.length === 0) continue;
    const replacement = alternatives[Math.floor(random() * alternatives.length)]!;
    result[idx] = replacement.text;
  }
  return result;
}

/** Delete a `strength` fraction of words outright, at random positions. */
export function deleteAttack(words: string[], strength: number, random: () => number): string[] {
  const count = Math.round(strength * words.length);
  const toRemove = new Set(sampleIndicesWithoutReplacement(words.length, count, random));
  return words.filter((_, i) => !toRemove.has(i));
}

const NON_PUNCTUATION_CATEGORIES: PosCategory[] = [
  'ARTICLE',
  'ADJECTIVE',
  'NOUN',
  'VERB',
  'ADVERB',
  'PREPOSITION',
  'CONJUNCTION',
];
const INSERTABLE_WORDS: VocabWord[] = VOCAB.filter((w) =>
  NON_PUNCTUATION_CATEGORIES.includes(w.category),
);

/** Insert `strength * length` random extra words at random positions —
 * grammar-blind noise, not a fluent edit. */
export function insertAttack(words: string[], strength: number, random: () => number): string[] {
  const count = Math.round(strength * words.length);
  const result = [...words];
  for (let i = 0; i < count; i++) {
    const word = INSERTABLE_WORDS[Math.floor(random() * INSERTABLE_WORDS.length)]!;
    const pos = Math.floor(random() * (result.length + 1));
    result.splice(pos, 0, word.text);
  }
  return result;
}

/** Swap `strength * (length - 1)` random adjacent pairs — a local shuffle
 * that increasingly scrambles word order (and therefore every green-list
 * context) as strength rises, without moving any word far from where it
 * started. */
export function reorderAttack(words: string[], strength: number, random: () => number): string[] {
  const result = [...words];
  if (result.length < 2) return result;
  const count = Math.round(strength * (result.length - 1));
  for (let i = 0; i < count; i++) {
    const pos = Math.floor(random() * (result.length - 1));
    const tmp = result[pos]!;
    result[pos] = result[pos + 1]!;
    result[pos + 1] = tmp;
  }
  return result;
}

export function applyAttack(
  words: string[],
  type: AttackType,
  strength: number,
  random: () => number,
): string[] {
  if (strength <= 0) return [...words];
  switch (type) {
    case 'substitute':
      return substituteAttack(words, strength, random);
    case 'delete':
      return deleteAttack(words, strength, random);
    case 'insert':
      return insertAttack(words, strength, random);
    case 'reorder':
      return reorderAttack(words, strength, random);
  }
}
