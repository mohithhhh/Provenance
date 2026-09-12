#!/usr/bin/env python3
"""Downloads and splits Module C's training data from HC3 (Hello-SimpleAI/HC3
on Hugging Face — see docs/dataset.md for license and source). Writes three
CSVs to apps/api/data/classifier/ (gitignored — never committed, consistent
with this project's policy of never bundling third-party datasets).

A fixed number of rows per HC3 source config are sampled (not the full
~24k-row "all" config) so the resulting dataset stays balanced across
domains — reddit_eli5 alone is ~70% of "all" — and training in
scripts/train_classifier.py stays fast on a laptop.

Usage: python scripts/prepare_hc3.py [--cap-per-source N] (from apps/api, venv active)
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

from app.classifier.dataset import fetch_examples, stratified_split

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "classifier"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cap-per-source", type=int, default=400)
    parser.add_argument("--seed", type=int, default=0)
    args = parser.parse_args()

    print(f"Fetching up to {args.cap_per_source} rows per HC3 source config...")
    examples = fetch_examples(cap_per_source=args.cap_per_source)
    print(
        f"Got {len(examples)} labeled examples "
        f"({sum(e.label for e in examples)} AI / {sum(1 - e.label for e in examples)} human)."
    )

    question_ids = sorted({e.question_id for e in examples})
    train_ids, calib_ids, test_ids = stratified_split(question_ids, seed=args.seed)
    split_by_id = {
        **{qid: "train" for qid in train_ids},
        **{qid: "calibration" for qid in calib_ids},
        **{qid: "test" for qid in test_ids},
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    writers: dict[str, list[tuple[str, int]]] = {"train": [], "calibration": [], "test": []}
    for e in examples:
        writers[split_by_id[e.question_id]].append((e.text, e.label))

    for split_name, rows in writers.items():
        path = DATA_DIR / f"{split_name}.csv"
        with path.open("w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerows([("text", "label"), *rows])
        print(f"  {split_name}: {len(rows)} rows -> {path}")


if __name__ == "__main__":
    main()
