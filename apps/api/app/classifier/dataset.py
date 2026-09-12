"""HC3 dataset fetch + split helpers for Module C (trained classifier).

Fetched via the Hugging Face `datasets-server` REST API (JSON rows over
plain HTTP) rather than the `datasets` library — that library pulls in
pyarrow and friends for what's here just a one-time paginated JSON fetch;
`urllib`/`json` from the standard library already does the job (same
disk-conscious reasoning as Module F choosing fastembed over
sentence-transformers — see docs/architecture.md).

See docs/dataset.md for the dataset's source, license (CC-BY-SA 4.0), and
what preprocessing is applied.
"""

from __future__ import annotations

import json
import random
import urllib.request
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

ROWS_URL = (
    "https://datasets-server.huggingface.co/rows"
    "?dataset=Hello-SimpleAI%2FHC3&config={source}&split=train&offset={offset}&length={length}"
)

# HC3's five English source configs (the "all" config is just their union;
# fetching per-source lets this script cap each one independently so one
# huge source — reddit_eli5 alone is ~70% of "all" — doesn't dominate the
# resulting dataset).
SOURCES = ("finance", "medicine", "open_qa", "reddit_eli5", "wiki_csai")

PAGE_SIZE = 100
MIN_WORDS = 20  # short answers don't carry enough signal for stylometric features


@dataclass(frozen=True)
class Example:
    question_id: str  # "{source}-{row_idx}", groups a question's human+AI answers together
    text: str
    label: int  # 1 = AI (chatgpt_answers), 0 = human


def _fetch_rows(source: str, cap: int) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    offset = 0
    while len(rows) < cap:
        url = ROWS_URL.format(source=source, offset=offset, length=PAGE_SIZE)
        with urllib.request.urlopen(url, timeout=30) as response:  # noqa: S310 (fixed https host)
            payload = json.loads(response.read())
        page = payload["rows"]
        if not page:
            break
        rows.extend(r["row"] for r in page)
        offset += PAGE_SIZE
    return rows[:cap]


def fetch_examples(cap_per_source: int = 500) -> list[Example]:
    """Downloads up to `cap_per_source` rows from each HC3 source config and
    flattens each row's first human answer and first ChatGPT answer into one
    labeled example each (skipping answers shorter than MIN_WORDS words)."""
    examples: list[Example] = []
    for source in SOURCES:
        for row in _fetch_rows(source, cap_per_source):
            qid = f"{source}-{row['id']}"
            human = row["human_answers"][0] if row["human_answers"] else None
            ai = row["chatgpt_answers"][0] if row["chatgpt_answers"] else None
            if human and len(human.split()) >= MIN_WORDS:
                examples.append(Example(question_id=qid, text=human, label=0))
            if ai and len(ai.split()) >= MIN_WORDS:
                examples.append(Example(question_id=qid, text=ai, label=1))
    return examples


def stratified_split(
    ids: Sequence[str],
    seed: int = 0,
    ratios: tuple[float, float, float] = (0.6, 0.2, 0.2),
) -> tuple[list[str], list[str], list[str]]:
    """Deterministically splits `ids` (question ids, so a question's human
    and AI answers land in the same split — no leakage between train and
    test on the same underlying question) into train/calibration/test."""
    shuffled = sorted(ids)
    random.Random(seed).shuffle(shuffled)
    n = len(shuffled)
    n_train = round(n * ratios[0])
    n_calib = round(n * ratios[1])
    return (
        shuffled[:n_train],
        shuffled[n_train : n_train + n_calib],
        shuffled[n_train + n_calib :],
    )
