"""Regression test for a real concurrency bug found while building Module
G's Attack Lab: the frontend calls /detect/statistical on the original and
attacked text *concurrently* (Promise.all), and FastAPI runs sync route
handlers in a thread pool — so two requests can call the shared, lazily-
loaded gpt2/distilgpt2 model singletons at the same time. Without a lock,
that produced silently wrong (not just crashing) results: concurrent calls
on the same input returned an identical, garbled value (~50257, suspiciously
equal to gpt2's vocab size) instead of each computing its own real,
consistent perplexity — occasionally extreme enough to overflow
`math.exp()` entirely.

This is a best-effort test: races are timing-dependent, so it can't
*guarantee* it reproduces the bug on every machine, but running several
concurrent calls on the same input and requiring identical results to a
sequential call catches it in practice (it did, reliably, during
development)."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

from app.detectors.perplexity import analyze_text

TEXT = (
    "An letter remembered. An distant storm imagined toward an distant "
    "letter beside garden. An gentle curious letter while an valley "
    "through an library calculated suddenly."
)


def test_concurrent_calls_on_the_same_text_agree_with_a_sequential_call() -> None:
    expected = analyze_text(TEXT).perplexity
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(analyze_text, TEXT) for _ in range(8)]
        results = [f.result().perplexity for f in futures]
    assert all(r == expected for r in results)
