import type { DetectResult, GenerateResult } from '@provenance/watermark-core';
import type { TokenChip } from './TokenView';

export type Scheme = 'greenlist' | 'gumbel';

/** Map a generation result's tokens to display chips. Gumbel generation
 * always sets `isGreen: true` (it's the definition of "the token chosen"),
 * so highlighting it green/red would be meaningless — shown neutral instead. */
export function generatedToChips(result: GenerateResult, scheme: Scheme): TokenChip[] {
  return result.tokens.map((t) => ({
    word: t.word,
    tone: scheme === 'greenlist' ? (t.isGreen ? 'green' : 'red') : 'neutral',
    title:
      scheme === 'greenlist'
        ? t.isGreen
          ? 'Sampled from the green list'
          : 'Sampled from the red list (this can still happen — the green list only biases sampling, it doesn’t forbid red tokens)'
        : undefined,
  }));
}

export function detectedToChips(result: DetectResult, scheme: Scheme): TokenChip[] {
  return result.tokens.map((t) => {
    if (!t.recognized) {
      return {
        word: t.word,
        tone: 'neutral',
        title: 'Not in the toy vocabulary — excluded from scoring',
      };
    }
    const tone: TokenChip['tone'] = t.isGreen ? 'green' : 'red';
    if (!t.counted) {
      return {
        word: t.word,
        tone,
        muted: true,
        title: 'Repeated (context, token) pair — excluded from the z-test to avoid double-counting',
      };
    }
    return {
      word: t.word,
      tone,
      title:
        scheme === 'greenlist'
          ? t.isGreen
            ? 'Green list'
            : 'Red list'
          : t.isGreen
            ? 'r > 0.5 for this position (above median)'
            : 'r ≤ 0.5 for this position (below median)',
    };
  });
}
