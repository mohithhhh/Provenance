/**
 * Deterministic hashing + seeded pseudo-randomness.
 *
 * The reference prototype this package was meant to port
 * (`reference/watermark-lab.html`) was never added to the repo, so this is a
 * from-scratch implementation — but it deliberately avoids `Math.sin()` as a
 * randomness source, which is a well-known bad idea (`Math.sin(x) * 10000`
 * is *not* a real PRNG: it's a smooth, low-entropy function of `x` with
 * visible periodicity). Everything here is a real, if non-cryptographic,
 * hash + PRNG pair — appropriate for a watermark whose adversary model is
 * "doesn't have the key", not "can break cryptographic hashes".
 */

/**
 * cyrb53 — a fast, well-distributed 53-bit non-cryptographic string hash.
 * Public domain, originally by bryc (https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js).
 */
export function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Hash a string deterministically to a float in [0, 1). */
export function hashToUnitInterval(str: string): number {
  return cyrb53(str) / 9007199254740992; // 2^53
}

/**
 * mulberry32 — a small, fast, seeded PRNG. Public domain, by Tommy Ettinger.
 * Given the same 32-bit integer seed, produces the same sequence every time,
 * which is what makes generation reproducible in tests (and, if a caller
 * wants it, reproducible demos).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function nextRandom(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build a mulberry32 generator seeded deterministically from a string. */
export function seededRandom(seed: string): () => number {
  return mulberry32(cyrb53(seed) >>> 0);
}
