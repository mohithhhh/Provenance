import { hashToUnitInterval } from './hash.js';
import type { VocabWord } from './types.js';

/**
 * The core primitive of the Kirchenbauer et al. (2023) "green-list"
 * watermark: given a secret key and the preceding token (the "context"),
 * deterministically partition the vocabulary into a green list (fraction
 * `gamma`) and a red list.
 *
 * The reference implementation seeds a PRNG once per context and shuffles
 * the vocabulary, taking the first `gamma * |V|` entries as green. This
 * hashes each word independently against a `gamma` threshold instead —
 * simpler to implement and to test, and statistically equivalent: for a
 * fixed context, `P(word is green) = gamma` for every word, independently.
 * With a vocabulary this small (~60 words) the *exact* green-list size
 * varies a little from `gamma * |V|` context to context, which is expected
 * and is itself verified in the test suite (see green-list.test.ts).
 */
export function getGreenSet(
  key: string,
  context: string,
  vocab: VocabWord[],
  gamma: number,
): Set<number> {
  const green = new Set<number>();
  for (const word of vocab) {
    const u = hashToUnitInterval(`${key}|${context}|${word.id}`);
    if (u < gamma) green.add(word.id);
  }
  return green;
}

/** Synthetic context used for the very first token, where there is no
 * preceding word to hash against. Using a fixed constant (rather than the
 * user's prompt) keeps generation and detection consistent: detection never
 * has access to the original prompt, only the text itself. */
export const START_CONTEXT = 'START';
