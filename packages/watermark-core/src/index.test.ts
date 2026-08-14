import { describe, expect, it } from 'vitest';
import { WATERMARK_CORE_VERSION } from './index.js';

describe('watermark-core scaffold', () => {
  it('exposes a version string (placeholder until Phase 1 port)', () => {
    expect(typeof WATERMARK_CORE_VERSION).toBe('string');
  });
});
