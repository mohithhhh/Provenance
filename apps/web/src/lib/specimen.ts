import type { ClassifyResponse, DetectStatisticalResponse } from './api';

/** Real, recorded output — not invented numbers. Captured 2026-10-24 by
 * POSTing SPLIT_TEXT to a local apps/api (`/detect/statistical`,
 * `/classify/text`, `/ledger/check`) with the committed thresholds and
 * classifier artifact. Re-capture if either changes. Both paragraphs are
 * original, written for this site. */

export const SPLIT_TEXT =
  'We tried to fix the fence and to paint the shed and to get the goat back in the pen. The goat ate the paintbrush and the fence fell on the shed and the shed fell on the goat. He was fine, and he ate a second paintbrush to prove it.';

export const SPLIT_B: Pick<DetectStatisticalResponse, 'verdict' | 'binocularsScore' | 'sentences'> =
  {
    verdict: 'likely-human',
    binocularsScore: 0.3281,
    sentences: [
      {
        text: 'We tried to fix the fence and to paint the shed and to get the goat back in the pen.',
        meanSurprisal: 4.089,
        topKFraction: 0.65,
        scored: true,
      },
      {
        text: 'The goat ate the paintbrush and the fence fell on the shed and the shed fell on the goat.',
        meanSurprisal: 3.79,
        topKFraction: 0.65,
        scored: true,
      },
      {
        text: 'He was fine, and he ate a second paintbrush to prove it.',
        meanSurprisal: 4.287,
        topKFraction: 0.5714,
        scored: true,
      },
    ],
  };

export const SPLIT_C: Pick<
  ClassifyResponse,
  'verdict' | 'aiProbability' | 'intervalLow' | 'intervalHigh' | 'confidenceLevel'
> = {
  verdict: 'likely-ai',
  aiProbability: 0.9995,
  intervalLow: 0.2998,
  intervalHigh: 1.0,
  confidenceLevel: 0.9,
};

export const SPLIT_F_MATCHED = false;

/** Second example for /ensemble — B and C both read it as human. */
export const AGREE_TEXT =
  "The kettle clicked off just as the power cut out, so we drank lukewarm tea by the window and argued about whether the storm would reach the coast. My sister was sure it would turn north. It did not. By midnight the street had become a shallow river, and somebody's recycling bin floated past the gate like a small, embarrassed boat.";
