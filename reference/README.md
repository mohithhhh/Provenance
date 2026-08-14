# reference/

This directory holds the original single-file HTML/JS prototype of Module A
(watermarking) — a from-scratch implementation of the Kirchenbauer et al.
(2023) green-list/red-list scheme with a toy bigram language model, a z-test
detector, and a UI to generate/detect.

Expected file: **`watermark-lab.html`** (add it here before Phase 1 starts).

It is kept for **porting reference only**. Its algorithm logic is ported
into `packages/watermark-core` in Phase 1; its `Math.sin()`-based hash is
replaced with a seeded PRNG (mulberry32) driven by a real hash, since
`Math.sin()` is not a real source of pseudo-randomness.

Nothing in this directory is imported by the app at build or run time.
