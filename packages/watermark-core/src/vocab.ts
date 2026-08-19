import type { PosCategory, VocabWord } from './types.js';

/**
 * A small, hand-written toy vocabulary and part-of-speech transition table.
 *
 * This is deliberately not a real language model. Real generative models
 * (used server-side for Modules B/C from Phase 4 onward) are far too heavy
 * to ship as a browser-only demo of a *watermarking algorithm* — and the
 * watermark scheme itself doesn't care what the underlying model is, so a
 * toy category-level Markov chain is enough to show green-list biasing and
 * z-test detection honestly, without pretending this produces fluent text.
 * Every word below is original, hand-picked filler — no scraped or
 * copyrighted corpus.
 */

const WORDS: Array<[string, PosCategory]> = [
  // ARTICLE
  ['the', 'ARTICLE'],
  ['a', 'ARTICLE'],
  ['an', 'ARTICLE'],
  // ADJECTIVE
  ['quiet', 'ADJECTIVE'],
  ['bright', 'ADJECTIVE'],
  ['ancient', 'ADJECTIVE'],
  ['curious', 'ADJECTIVE'],
  ['gentle', 'ADJECTIVE'],
  ['careful', 'ADJECTIVE'],
  ['sudden', 'ADJECTIVE'],
  ['tiny', 'ADJECTIVE'],
  ['distant', 'ADJECTIVE'],
  ['silent', 'ADJECTIVE'],
  // NOUN
  ['river', 'NOUN'],
  ['mountain', 'NOUN'],
  ['engineer', 'NOUN'],
  ['garden', 'NOUN'],
  ['signal', 'NOUN'],
  ['forest', 'NOUN'],
  ['machine', 'NOUN'],
  ['city', 'NOUN'],
  ['letter', 'NOUN'],
  ['storm', 'NOUN'],
  ['harbor', 'NOUN'],
  ['library', 'NOUN'],
  ['comet', 'NOUN'],
  ['bridge', 'NOUN'],
  ['valley', 'NOUN'],
  // VERB (past tense, so category chains read reasonably as narration)
  ['watched', 'VERB'],
  ['discovered', 'VERB'],
  ['whispered', 'VERB'],
  ['calculated', 'VERB'],
  ['wandered', 'VERB'],
  ['remembered', 'VERB'],
  ['imagined', 'VERB'],
  ['repaired', 'VERB'],
  ['listened', 'VERB'],
  ['arrived', 'VERB'],
  ['vanished', 'VERB'],
  ['gathered', 'VERB'],
  // ADVERB
  ['slowly', 'ADVERB'],
  ['quietly', 'ADVERB'],
  ['suddenly', 'ADVERB'],
  ['carefully', 'ADVERB'],
  ['eagerly', 'ADVERB'],
  ['rarely', 'ADVERB'],
  ['gently', 'ADVERB'],
  ['finally', 'ADVERB'],
  // PREPOSITION
  ['near', 'PREPOSITION'],
  ['beyond', 'PREPOSITION'],
  ['beside', 'PREPOSITION'],
  ['under', 'PREPOSITION'],
  ['through', 'PREPOSITION'],
  ['across', 'PREPOSITION'],
  ['within', 'PREPOSITION'],
  ['toward', 'PREPOSITION'],
  // CONJUNCTION
  ['and', 'CONJUNCTION'],
  ['but', 'CONJUNCTION'],
  ['while', 'CONJUNCTION'],
  ['because', 'CONJUNCTION'],
  // PUNCTUATION
  ['.', 'PUNCTUATION'],
];

export const VOCAB: VocabWord[] = WORDS.map(([text, category], id) => ({ id, text, category }));

export const VOCAB_BY_TEXT: ReadonlyMap<string, VocabWord> = new Map(VOCAB.map((w) => [w.text, w]));

export function findVocabWord(text: string): VocabWord | undefined {
  return VOCAB_BY_TEXT.get(text);
}

export function wordsInCategory(category: PosCategory): VocabWord[] {
  return VOCAB.filter((w) => w.category === category);
}

/**
 * Relative weights for "what category comes after category X". Not
 * probabilities (they don't need to sum to 1 — `weightedSample` normalizes).
 * Every reachable category has at least one path back toward PUNCTUATION so
 * generation can't get stuck.
 */
export const POS_TRANSITIONS: Record<PosCategory, Partial<Record<PosCategory, number>>> = {
  START: { ARTICLE: 1 },
  ARTICLE: { ADJECTIVE: 0.5, NOUN: 0.5 },
  ADJECTIVE: { ADJECTIVE: 0.2, NOUN: 0.8 },
  NOUN: { VERB: 0.55, CONJUNCTION: 0.15, PREPOSITION: 0.15, PUNCTUATION: 0.15 },
  VERB: { ADVERB: 0.3, PREPOSITION: 0.25, ARTICLE: 0.2, PUNCTUATION: 0.25 },
  ADVERB: { VERB: 0.3, PREPOSITION: 0.3, PUNCTUATION: 0.4 },
  PREPOSITION: { ARTICLE: 0.8, NOUN: 0.2 },
  CONJUNCTION: { ARTICLE: 0.6, NOUN: 0.2, ADJECTIVE: 0.2 },
  PUNCTUATION: { ARTICLE: 1 },
};
