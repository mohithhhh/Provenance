/**
 * Shared types for the toy vocabulary and both watermarking schemes.
 */

/**
 * Coarse part-of-speech category driving the toy Markov chain's grammar.
 * `START` is a synthetic category used only as the chain's initial state,
 * never assigned to an actual word.
 */
export type PosCategory =
  | 'START'
  | 'ARTICLE'
  | 'ADJECTIVE'
  | 'NOUN'
  | 'VERB'
  | 'ADVERB'
  | 'PREPOSITION'
  | 'CONJUNCTION'
  | 'PUNCTUATION';

export interface VocabWord {
  /** Stable numeric id — used as the unit the green-list hash keys off. */
  id: number;
  /** Lowercase canonical form; this is what generation/detection match on. */
  text: string;
  category: PosCategory;
}

/** A single generated word, tagged with whether it was sampled as "green". */
export interface GeneratedToken {
  word: string;
  isGreen: boolean;
}

/** A single token from detection input, tagged with what was learned about it. */
export interface DetectedToken {
  word: string;
  /** Whether this word exists in the toy vocabulary at all. */
  recognized: boolean;
  /**
   * Whether it fell in the green list for its (context-derived) position.
   * `null` when unrecognized, since green/red membership is undefined for
   * words outside the toy vocabulary.
   */
  isGreen: boolean | null;
  /**
   * Whether this occurrence actually contributed to the z-test statistic.
   * The z-test assumes each scored token is an independent draw, which
   * breaks if the same (context, token) pair repeats — repeats always get
   * the same green/red verdict, so counting them again would silently
   * inflate confidence. Per the original green-list paper's own handling of
   * repeated n-grams, only each pair's *first* occurrence is counted;
   * later repeats are still shown (and still correctly marked green/red)
   * but excluded from `greenCount`/`totalScored`.
   */
  counted: boolean;
}

export type WatermarkVerdict = 'watermarked' | 'human' | 'insufficient-evidence';

export interface GenerateResult {
  text: string;
  tokens: GeneratedToken[];
}

export interface DetectResult {
  /** Number of recognized tokens that scored "green" (or, for the Gumbel
   * scheme, contributed to the watermark statistic — see that scheme's
   * detect function for the precise meaning). */
  greenCount: number;
  /** Number of tokens actually used in the statistical test (recognized,
   * vocabulary words only — see docs/limitations.md). */
  totalScored: number;
  /** Total tokens found in the input text, recognized or not. */
  totalTokens: number;
  zScore: number;
  pValue: number;
  verdict: WatermarkVerdict;
  tokens: DetectedToken[];
}
