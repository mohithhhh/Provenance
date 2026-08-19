import { generateGreenListText, mulberry32 } from '@provenance/watermark-core';
import { describe, expect, it } from 'vitest';
import { detectedToChips, generatedToChips } from './chips';

describe('generatedToChips', () => {
  it('tones green-list tokens green or red based on isGreen', () => {
    const result = generateGreenListText({ key: 'k', length: 20, random: mulberry32(1) });
    const chips = generatedToChips(result, 'greenlist');
    expect(chips).toHaveLength(result.tokens.length);
    for (let i = 0; i < chips.length; i++) {
      expect(chips[i]!.tone).toBe(result.tokens[i]!.isGreen ? 'green' : 'red');
    }
  });

  it('leaves gumbel tokens neutral (isGreen is trivially true for every token)', () => {
    const result = generateGreenListText({ key: 'k', length: 10, random: mulberry32(1) });
    const chips = generatedToChips(result, 'gumbel');
    expect(chips.every((c) => c.tone === 'neutral')).toBe(true);
  });
});

describe('detectedToChips', () => {
  it('maps unrecognized tokens to neutral with an explanatory title', () => {
    const chips = detectedToChips(
      {
        greenCount: 0,
        totalScored: 0,
        totalTokens: 1,
        zScore: 0,
        pValue: 1,
        verdict: 'insufficient-evidence',
        tokens: [{ word: 'xyzzy', recognized: false, isGreen: null, counted: false }],
      },
      'greenlist',
    );
    expect(chips[0]).toMatchObject({ word: 'xyzzy', tone: 'neutral' });
    expect(chips[0]!.title).toMatch(/not in the toy vocabulary/i);
  });

  it('mutes and annotates repeated (uncounted) tokens without losing their color', () => {
    const chips = detectedToChips(
      {
        greenCount: 1,
        totalScored: 1,
        totalTokens: 2,
        zScore: 0,
        pValue: 1,
        verdict: 'insufficient-evidence',
        tokens: [
          { word: 'the', recognized: true, isGreen: true, counted: true },
          { word: 'the', recognized: true, isGreen: true, counted: false },
        ],
      },
      'greenlist',
    );
    expect(chips[0]).toMatchObject({ tone: 'green' });
    expect(chips[0]!.muted).toBeFalsy();
    expect(chips[1]).toMatchObject({ tone: 'green', muted: true });
    expect(chips[1]!.title).toMatch(/repeated/i);
  });

  it('gives green/red tokens a scheme-appropriate title', () => {
    const green = detectedToChips(
      {
        greenCount: 1,
        totalScored: 1,
        totalTokens: 1,
        zScore: 0,
        pValue: 1,
        verdict: 'human',
        tokens: [{ word: 'the', recognized: true, isGreen: true, counted: true }],
      },
      'gumbel',
    );
    expect(green[0]!.title).toMatch(/above median/i);
  });
});
