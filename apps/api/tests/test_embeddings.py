"""Integration tests against the real fastembed model. Slower than the rest
of the suite (model load — cached after the first run on a machine, but a
first run anywhere, including CI, needs network access to download it; see
apps/api/README.md) — kept to a handful of tests on purpose."""

from __future__ import annotations

import numpy as np
import pytest

from app.embeddings import EMBEDDING_DIM, cosine_similarity, embed


def test_embed_returns_correct_shape() -> None:
    vector = embed("Hello, world.")
    assert vector.shape == (EMBEDDING_DIM,)
    assert vector.dtype == np.float32


def test_cosine_similarity_of_identical_vectors_is_one() -> None:
    vector = embed("The committee approved the new budget on Tuesday.")
    assert cosine_similarity(vector, vector) == pytest.approx(1.0, abs=1e-5)


def test_cosine_similarity_handles_zero_vector() -> None:
    zero = np.zeros(EMBEDDING_DIM, dtype=np.float32)
    assert cosine_similarity(zero, zero) == 0.0


def test_paraphrase_scores_higher_than_unrelated_text() -> None:
    original = embed("The committee approved the new budget on Tuesday.")
    paraphrase = embed("Budget approval came from the committee this past Tuesday.")
    unrelated = embed("The cat slept on the warm windowsill all afternoon.")

    sim_paraphrase = cosine_similarity(original, paraphrase)
    sim_unrelated = cosine_similarity(original, unrelated)

    assert sim_paraphrase > sim_unrelated
    # Empirically ~0.94 vs ~0.36 (see docs/architecture.md) — a wide,
    # reliable gap rather than a knife-edge threshold.
    assert sim_paraphrase > 0.85
    assert sim_unrelated < 0.6
