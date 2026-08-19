/**
 * @provenance/watermark-core
 *
 * Shared watermarking + statistical-detection logic, framework-agnostic.
 * Two schemes are implemented, both original/independent implementations
 * of published academic algorithms — see each scheme file for citations,
 * and the root README / docs/limitations.md for what this can't do.
 */

export { generateGreenListText, detectGreenListText } from './schemes/green-list.js';
export type { GreenListGenerateOptions, GreenListDetectOptions } from './schemes/green-list.js';

export { generateGumbelText, detectGumbelText } from './schemes/gumbel.js';
export type { GumbelGenerateOptions, GumbelDetectOptions } from './schemes/gumbel.js';

export type {
  DetectedToken,
  DetectResult,
  GeneratedToken,
  GenerateResult,
  PosCategory,
  VocabWord,
  WatermarkVerdict,
} from './types.js';

export { VOCAB } from './vocab.js';
export { cyrb53, hashToUnitInterval, mulberry32, seededRandom } from './hash.js';
export { normalCdf, pValueFromZ } from './stats.js';
