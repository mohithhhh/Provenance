"""Unit tests for Module C's prediction + conformal-interval math. These
build a tiny synthetic `ClassifierArtifact` by hand rather than loading the
real trained one — fast, deterministic, and tests the math independent of
whatever HC3 training happens to produce (mirrors how Module A's z-test
tests use hand-computed fixed inputs, not a full generation run)."""

from __future__ import annotations

import pytest

from app.classifier.features import FEATURE_NAMES
from app.classifier.model import ClassifierArtifact, conformal_quantile, predict_from_artifact

_N = len(FEATURE_NAMES)


def _artifact(
    coef: list[float] | None = None, intercept: float = 0.0, quantile: float = 0.05
) -> ClassifierArtifact:
    return ClassifierArtifact(
        feature_names=FEATURE_NAMES,
        mean=tuple(0.0 for _ in range(_N)),
        scale=tuple(1.0 for _ in range(_N)),
        coef=tuple(coef) if coef is not None else tuple(0.0 for _ in range(_N)),
        intercept=intercept,
        quantile=quantile,
        alpha=0.1,
    )


class TestPredictFromArtifact:
    def test_zero_coefficients_and_intercept_give_50_percent(self) -> None:
        prediction = predict_from_artifact(_artifact(), "some ordinary sentence here.")
        assert prediction.ai_probability == pytest.approx(0.5)

    def test_interval_is_centered_on_probability_with_width_2x_quantile(self) -> None:
        prediction = predict_from_artifact(_artifact(quantile=0.05), "some ordinary sentence here.")
        assert prediction.interval_low == pytest.approx(0.45)
        assert prediction.interval_high == pytest.approx(0.55)

    def test_interval_is_clipped_to_valid_probability_range(self) -> None:
        prediction = predict_from_artifact(
            _artifact(intercept=10.0, quantile=0.5), "some ordinary sentence here."
        )
        assert prediction.ai_probability > 0.99
        assert prediction.interval_high == 1.0  # would be >1 unclipped

    def test_contribution_reflects_single_nonzero_coefficient(self) -> None:
        coef = [0.0] * _N
        target_index = FEATURE_NAMES.index("type_token_ratio")
        coef[target_index] = 2.0
        prediction = predict_from_artifact(_artifact(coef=coef), "the cat sat on the mat")
        # feature is standardized with mean=0/scale=1, so contribution == 2.0 * raw feature value
        from app.classifier.features import extract_features

        raw_value = extract_features("the cat sat on the mat")[target_index]
        assert prediction.contributions[target_index] == pytest.approx(2.0 * raw_value)
        assert all(c == 0.0 for i, c in enumerate(prediction.contributions) if i != target_index)


class TestConformalQuantile:
    def test_raises_on_empty_residuals(self) -> None:
        with pytest.raises(ValueError):
            conformal_quantile([], alpha=0.1)

    def test_small_sample_finite_correction_returns_the_max_residual(self) -> None:
        # n=5, alpha=0.2 -> q_level = ceil(6*0.8)/5 = 1.0, i.e. the finite-
        # sample correction demands the full range at this small n.
        residuals = [0.1, 0.2, 0.3, 0.4, 0.5]
        assert conformal_quantile(residuals, alpha=0.2) == pytest.approx(0.5)

    def test_larger_sample_returns_a_quantile_below_the_max(self) -> None:
        # n=99, alpha=0.1 -> q_level = ceil(100*0.9)/99 = 90/99; the
        # "higher" empirical quantile of 1..99 at that level is 91.
        residuals = [float(i) for i in range(1, 100)]
        assert conformal_quantile(residuals, alpha=0.1) == pytest.approx(91.0)
