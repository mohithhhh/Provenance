#!/usr/bin/env python3
"""Trains Module C's classifier: logistic regression over the stylometric
features in app/classifier/features.py, standardized, plus a split-conformal
calibration step (app/classifier/model.py) — see docs/architecture.md.

Reads apps/api/data/classifier/{train,calibration,test}.csv (produced by
scripts/prepare_hc3.py — run that first) and writes the trained artifact to
app/classifier/artifact/model.json, which IS committed (it's a small,
human-readable set of learned parameters, not the training data itself).

Usage: PYTHONPATH=. python scripts/train_classifier.py (from apps/api, venv active)
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.preprocessing import StandardScaler

from app.classifier.features import FEATURE_NAMES, extract_features
from app.classifier.model import ARTIFACT_PATH, conformal_quantile

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "classifier"
ALPHA = 0.1  # target 90% conformal coverage


def _load_split(name: str) -> tuple[np.ndarray, np.ndarray]:
    path = DATA_DIR / f"{name}.csv"
    with path.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    X = np.array([extract_features(r["text"]) for r in rows])
    y = np.array([int(r["label"]) for r in rows])
    return X, y


def main() -> None:
    X_train, y_train = _load_split("train")
    X_calib, y_calib = _load_split("calibration")
    X_test, y_test = _load_split("test")
    print(f"train={len(y_train)} calibration={len(y_calib)} test={len(y_test)}")

    scaler = StandardScaler().fit(X_train)
    model = LogisticRegression(max_iter=1000).fit(scaler.transform(X_train), y_train)

    # Held-out evaluation (never seen during fit or calibration).
    p_test = model.predict_proba(scaler.transform(X_test))[:, 1]
    y_pred = (p_test >= 0.5).astype(int)
    print("\n## Evaluation (held-out test split)\n")
    print(f"Accuracy:  {accuracy_score(y_test, y_pred):.3f}")
    print(f"Precision: {precision_score(y_test, y_pred):.3f}")
    print(f"Recall:    {recall_score(y_test, y_pred):.3f}")
    print(f"F1:        {f1_score(y_test, y_pred):.3f}")
    print(f"ROC-AUC:   {roc_auc_score(y_test, p_test):.3f}")
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
    print(f"Confusion matrix: TN={tn} FP={fp} FN={fn} TP={tp}")

    # Split-conformal calibration: nonconformity = |y - p_hat| on a split the
    # model never trained or was evaluated on.
    p_calib = model.predict_proba(scaler.transform(X_calib))[:, 1]
    residuals = np.abs(y_calib - p_calib)
    quantile = conformal_quantile(residuals.tolist(), alpha=ALPHA)

    # Measure actual coverage on the (also held-out) test split, rather than
    # just trusting the theoretical guarantee — honest, not hand-waved.
    covered = np.abs(y_test - p_test) <= quantile
    print(f"\nConformal quantile (alpha={ALPHA}): {quantile:.3f}")
    print(f"Measured test-set coverage: {covered.mean():.3f} (target: {1 - ALPHA:.2f})")

    print("\n## Top feature coefficients (standardized)\n")
    for name, coef in sorted(
        zip(FEATURE_NAMES, model.coef_[0], strict=True), key=lambda t: -abs(t[1])
    )[:8]:
        print(f"{name:28s} {coef:+.3f}")

    artifact = {
        "feature_names": list(FEATURE_NAMES),
        "mean": scaler.mean_.tolist(),
        "scale": scaler.scale_.tolist(),
        "coef": model.coef_[0].tolist(),
        "intercept": float(model.intercept_[0]),
        "quantile": quantile,
        "alpha": ALPHA,
    }
    ARTIFACT_PATH.parent.mkdir(parents=True, exist_ok=True)
    ARTIFACT_PATH.write_text(json.dumps(artifact, indent=2) + "\n")
    print(f"\nWrote artifact to {ARTIFACT_PATH}")


if __name__ == "__main__":
    main()
