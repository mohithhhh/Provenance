import { describe, expect, it } from 'vitest';
import { WATERMARK_CORE_VERSION } from './watermark-core-version';

describe('watermark-core workspace link', () => {
  it('resolves @provenance/watermark-core from the monorepo workspace', () => {
    expect(typeof WATERMARK_CORE_VERSION).toBe('string');
  });
});
