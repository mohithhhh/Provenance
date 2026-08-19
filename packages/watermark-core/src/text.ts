import type { PosCategory, VocabWord } from './types.js';
import { POS_TRANSITIONS, wordsInCategory } from './vocab.js';

/** Weighted random choice. `weights` need not sum to 1. Throws on an empty list. */
export function weightedSample<T>(items: T[], weights: number[], random: () => number): T {
  if (items.length === 0) {
    throw new Error('weightedSample: items must be non-empty');
  }
  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

/** Sample the next POS category given the current one, per POS_TRANSITIONS. */
export function sampleNextCategory(current: PosCategory, random: () => number): PosCategory {
  const options = POS_TRANSITIONS[current];
  const categories = Object.keys(options) as PosCategory[];
  const weights = categories.map((c) => options[c]!);
  return weightedSample(categories, weights, random);
}

/** Candidate vocabulary words for a given next category. */
export function candidatesForCategory(category: PosCategory): VocabWord[] {
  return wordsInCategory(category);
}

/**
 * Render a flat token list (as produced by generation) into readable text:
 * attaches '.' to the previous word instead of spacing it, and capitalizes
 * the first letter of each sentence.
 */
export function renderTokens(words: string[]): string {
  let out = '';
  let capitalizeNext = true;
  for (const w of words) {
    if (w === '.') {
      out = out.trimEnd() + '. ';
      capitalizeNext = true;
      continue;
    }
    const display = capitalizeNext ? w.charAt(0).toUpperCase() + w.slice(1) : w;
    out += display + ' ';
    capitalizeNext = false;
  }
  return out.trim();
}

/**
 * Tokenize arbitrary input text for detection: lowercase, then pull out
 * runs of letters and standalone '.' characters. Anything else (numbers,
 * other punctuation, emoji, ...) is dropped — this toy vocabulary has no
 * representation for it, which is a real, documented limitation (see
 * docs/limitations.md), not a bug to silently paper over.
 */
export function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-z]+|\./g);
  return matches ?? [];
}
