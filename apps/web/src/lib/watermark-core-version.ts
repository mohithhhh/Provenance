import { WATERMARK_CORE_VERSION } from '@provenance/watermark-core';

/**
 * Re-exported so the web app has one real (if trivial) import from the
 * shared package — this proves the npm workspace link resolves end to end.
 * Superseded by real usage once Module A's generate/detect UI lands (Phase 1).
 */
export { WATERMARK_CORE_VERSION };
