/**
 * Statistics helpers shared by both detection schemes' z-tests.
 */

/**
 * Standard normal CDF, via the Abramowitz & Stegun 7.1.26 approximation to
 * the error function (max absolute error ≈ 1.5e-7 — plenty for the p-values
 * a demo watermark detector reports).
 */
export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * ax);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

/** One-sided p-value for a z-score under the null "not watermarked". */
export function pValueFromZ(z: number): number {
  return 1 - normalCdf(z);
}
