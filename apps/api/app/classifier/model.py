"""Module C: trained classifier + calibrated confidence.

A logistic regression over the stylometric features in `features.py`,
trained on HC3 (see `docs/dataset.md`) by `scripts/train_classifier.py`,
wrapped in **split conformal prediction** (Vovk, Gammerman, Shafer,
"Algorithmic Learning in a Random World", 2005; the interval-around-a-
point-estimate form used here follows the split-conformal regression setup
in Lei, G'Sell, Rinaldo, Tibshirani, Wasserman, "Distribution-Free
Predictive Inference for Regression", 2018) so the API returns a
coverage-guaranteed interval around the AI-probability estimate instead of
a bare, uncalibrated percentage. `docs/limitations.md` documents what that
guarantee does and doesn't promise (marginal coverage under exchangeability,
not per-example).

The trained artifact is a small, human-readable JSON of the standardization
+ logistic-regression parameters (not a pickle) — plain floats, git-diffable,
no arbitrary-code-execution surface from loading it.
"""

from __future__ import annotations

import json
import math
from collections.abc import Sequence
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np

from .features import extract_features

ARTIFACT_PATH = Path(__file__).resolve().parent / "artifact" / "model.json"


@dataclass(frozen=True)
class ClassifierArtifact:
    feature_names: tuple[str, ...]
    mean: tuple[float, ...]
    scale: tuple[float, ...]
    coef: tuple[float, ...]
    intercept: float
    quantile: float  # conformal nonconformity quantile at `alpha`, from calibration
    alpha: float  # miscoverage rate; interval targets (1 - alpha) coverage

    @staticmethod
    def from_dict(d: dict[str, Any]) -> ClassifierArtifact:
        return ClassifierArtifact(
            feature_names=tuple(d["feature_names"]),
            mean=tuple(d["mean"]),
            scale=tuple(d["scale"]),
            coef=tuple(d["coef"]),
            intercept=d["intercept"],
            quantile=d["quantile"],
            alpha=d["alpha"],
        )


@lru_cache(maxsize=1)
def load_artifact(path: Path = ARTIFACT_PATH) -> ClassifierArtifact:
    data = json.loads(path.read_text())
    return ClassifierArtifact.from_dict(data)


@dataclass(frozen=True)
class Prediction:
    ai_probability: float
    interval_low: float
    interval_high: float
    raw_features: tuple[float, ...]  # unstandardized feature values, aligned to feature_names
    contributions: tuple[float, ...]  # per-feature logit contribution, aligned to feature_names


def predict_from_artifact(artifact: ClassifierArtifact, text: str) -> Prediction:
    raw = extract_features(text)
    scaled = tuple(
        (v - m) / s if s else 0.0
        for v, m, s in zip(raw, artifact.mean, artifact.scale, strict=True)
    )
    contributions = tuple(c * v for c, v in zip(artifact.coef, scaled, strict=True))
    logit = artifact.intercept + sum(contributions)
    probability = 1.0 / (1.0 + math.exp(-logit))
    return Prediction(
        ai_probability=probability,
        interval_low=max(0.0, probability - artifact.quantile),
        interval_high=min(1.0, probability + artifact.quantile),
        raw_features=raw,
        contributions=contributions,
    )


def conformal_quantile(residuals: Sequence[float], alpha: float) -> float:
    """The split-conformal quantile of calibration nonconformity scores
    (here, `|y - p_hat|` on held-out calibration examples): the finite-
    sample-corrected `ceil((n+1)(1-alpha))/n` empirical quantile, which is
    what gives the resulting interval its marginal `(1-alpha)` coverage
    guarantee (Vovk et al., 2005) rather than the naive `1-alpha` quantile.
    """
    n = len(residuals)
    if n == 0:
        raise ValueError("need at least one calibration residual")
    q_level = min(1.0, math.ceil((n + 1) * (1 - alpha)) / n)
    return float(np.quantile(residuals, q_level, method="higher"))
