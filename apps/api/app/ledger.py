"""Module F: retrieval provenance ledger.

Logs text this suite is told to treat as "generated" (with its embedding),
and later answers "have I seen something like this before?" by nearest-
neighbor search over logged embeddings — cosine similarity survives
paraphrasing far better than exact-match or n-gram overlap, which is the
entire point (see Krishna, Song, Karpinska, Wieting, Iyyer, "Paraphrasing
evades detectors of AI-generated text, but retrieval is an effective
defense", 2023).

This can only ever recognize content that was actually logged here first —
it is not a general AI-text detector, and cannot retroactively identify
arbitrary text it never saw. See docs/limitations.md.

Nearest-neighbor search here is brute-force cosine similarity over every
row, loaded into memory per query. That's a deliberate, documented
simplification appropriate at demo scale (hundreds to low thousands of
entries) — a real system at scale would use an ANN index (FAISS, HNSW,
pgvector), not a full table scan.
"""

from __future__ import annotations

import sqlite3
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

from .embeddings import cosine_similarity, embed

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "ledger.db"

# Empirically chosen — see docs/architecture.md's "Module F" section for the
# similarity table this is based on. 0.85 cleanly separates genuine
# paraphrase (0.92-1.0 in that table) from merely-same-topic-but-different-
# content text (0.74), which this scheme cannot reliably tell apart from a
# real paraphrase at a lower threshold.
DEFAULT_SIMILARITY_THRESHOLD = 0.85


@dataclass(frozen=True)
class LedgerEntry:
    id: int
    text: str
    source: str
    created_at: str


@dataclass(frozen=True)
class Match:
    entry: LedgerEntry
    similarity: float


class Ledger:
    def __init__(
        self,
        db_path: Path | str = DEFAULT_DB_PATH,
        embed_fn: Callable[[str], np.ndarray] = embed,
    ) -> None:
        """`embed_fn` defaults to the real fastembed model, but tests inject
        a cheap deterministic fake so most of this class's tests don't pay
        for model load or need network access — see tests/test_ledger.py."""
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._embed = embed_fn
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS ledger_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    text TEXT NOT NULL,
                    source TEXT NOT NULL,
                    embedding BLOB NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )

    def log(self, text: str, source: str) -> LedgerEntry:
        if not text.strip():
            raise ValueError("text must not be empty")
        vector = self._embed(text)
        created_at = datetime.now(UTC).isoformat()
        with self._connect() as conn:
            cursor = conn.execute(
                "INSERT INTO ledger_entries (text, source, embedding, created_at) "
                "VALUES (?, ?, ?, ?)",
                (text, source, vector.astype(np.float32).tobytes(), created_at),
            )
            entry_id = cursor.lastrowid
        assert entry_id is not None
        return LedgerEntry(id=entry_id, text=text, source=source, created_at=created_at)

    def count(self) -> int:
        with self._connect() as conn:
            (n,) = conn.execute("SELECT COUNT(*) FROM ledger_entries").fetchone()
        return int(n)

    def list_recent(self, limit: int = 50) -> list[LedgerEntry]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id, text, source, created_at FROM ledger_entries "
                "ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [LedgerEntry(id=r[0], text=r[1], source=r[2], created_at=r[3]) for r in rows]

    def find_nearest(self, text: str, top_k: int = 3) -> list[Match]:
        query_vector = self._embed(text)
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id, text, source, embedding, created_at FROM ledger_entries"
            ).fetchall()

        matches = [
            Match(
                entry=LedgerEntry(
                    id=entry_id, text=entry_text, source=source, created_at=created_at
                ),
                similarity=cosine_similarity(query_vector, np.frombuffer(blob, dtype=np.float32)),
            )
            for entry_id, entry_text, source, blob, created_at in rows
        ]
        matches.sort(key=lambda m: m.similarity, reverse=True)
        return matches[:top_k]
