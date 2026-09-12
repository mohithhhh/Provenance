# Limitations

This suite does not "solve" AI-content detection — nobody's does. This page
is where known blind spots are documented plainly rather than hidden. It is
filled in further as each module lands; the items below are known up front
and apply regardless of phase.

## Scope disclaimers (apply to every module)

- **No module in this suite detects any vendor's real production
  watermark or classifier.** Module A is an original, independent
  implementation of the published Kirchenbauer et al. (2023) green-list
  scheme and Aaronson's Gumbel scheme, for education/research. It cannot
  detect watermarks from Anthropic, OpenAI, Google, or any other vendor's
  actual production systems, because those schemes and keys are not public.
- **Module F (retrieval ledger) only recognizes content this suite itself
  generated and logged at generation time.** It is not a general AI
  detector and cannot retroactively identify arbitrary AI-generated text
  it never saw — this is a fundamental property of retrieval-based
  defenses, not a bug. See Krishna et al., "Paraphrasing evades detectors
  of AI-generated text, but retrieval is an effective defense."
  It also has a subtler, measured limitation: its embedding similarity
  conflates _topic_ with _content_ to some degree. In this project's own
  measurements (`docs/architecture.md`), a sentence asserting the
  **opposite** of a logged claim ("the committee _rejected_..." vs. "...
  _approved_...") scores 0.738 cosine similarity — closer to a genuine
  paraphrase (0.92–1.0) than to unrelated text (0.36) than one might
  expect. The 0.85 threshold is chosen to sit clear of that specific case,
  but it means this module verifies rough semantic proximity, not factual
  identity.
- **Module B (statistical detector) measures predictability to two small
  specific models, not "humanness."** A human quoting a famous line or a
  well-worn cliché can score differently than the same person's original
  prose, because a small language model's perplexity partly reflects what
  it memorized during pretraining. Manual testing during development (see
  `docs/architecture.md`) didn't break the method, but the risk is real
  and inherent to any perplexity-based approach, not specific to this
  implementation.
- **Module C (trained classifier) learned correlations specific to HC3's
  human vs. ChatGPT answers, not general markers of "AI writing."** Its
  stylometric features (lexical diversity, function-word frequency,
  punctuation habits) reflect how HC3's particular human respondents and
  ChatGPT (as of the snapshot HC3 was collected from) happen to differ —
  not a universal signature of machine generation. A different AI system,
  writing style, or domain than HC3's five source topics (finance,
  medicine, open QA, Reddit ELI5, Wikipedia CS/AI) can look different to
  this model in either direction. Its conformal prediction interval
  (`docs/architecture.md`) has a **marginal** coverage guarantee — true on
  average across many predictions under an exchangeability assumption
  between the calibration data and whatever text is scored — not a
  per-example guarantee, and that assumption is weaker the further a given
  input is from HC3's own distribution.
- **Module D (file provenance) only covers images (JPEG/PNG/WEBP), not
  PDFs**, despite the original phase plan mentioning both — C2PA embeds
  manifests differently in PDFs, and EXIF doesn't apply to PDFs at all,
  so supporting them was cut from Phase 6's scope (see
  `docs/architecture.md`). It also only verifies a manifest if one is
  present: the overwhelming majority of images on the internet have no
  C2PA data at all, and a `no-manifest` result says nothing about whether
  such an image is AI-generated — this module is not a fallback detector
  for unsigned content, unlike Modules B/C/F.
- **The Attack Lab (Module G) demonstrates robustness under the attacks it
  implements** (paraphrase, synonym substitution, reordering, truncation).
  It is not proof of robustness against attacks outside that set, nor
  against an adaptive attacker who has access to this suite's own source.
  The paraphrase attack specifically needs a ~240MB local model
  (`mrm8488/t5-small-finetuned-quora-for-paraphrasing`) that this project's
  own dev machine did not have disk space for while building this phase —
  it's fully implemented and reports a clear "unavailable" state rather
  than failing silently, but wasn't run for real here; see
  `docs/architecture.md`.
- **Module C does not generalize past HC3's training distribution.**
  Module G's benchmark script (`scripts/attack_lab_benchmark.py`) found
  Module C scoring 7/16 (44% — worse than chance) on a set of short
  personal-narrative human sentences and raw gpt2 autocomplete
  continuations, **before any attack was applied at all**. This isn't an
  attack-robustness finding — it's a domain-generalization gap: Module C's
  stylometric features learned real signal specific to HC3's long-form
  Q&A register and ChatGPT's specific style, and that signal does not
  transfer to a different genre or a different generator. Module C's own
  measured 81.4% accuracy (`docs/benchmark.md`) describes its performance
  on HC3-distributed text specifically, not general AI-text detection.

## The base-model blind spot

Recent research shows that text generated by **base (non-instruction-tuned)
language models** tends to read as human to most AI-content detectors,
including statistical and classifier-based ones — the stylistic signals
these detectors learn from are largely artifacts of RLHF/instruction-tuning,
not of machine generation per se. Modules B and C in this suite are
expected to share this blind spot, since they use the same class of
statistical/classifier signals as the published detectors this research
was run against.

This is **documented here as a known, unsolved gap**, not something this
project claims to fix. A future phase could add an evaluation against
base-model outputs to quantify the effect on this suite specifically, but
no such fix is planned as part of Phases 0–9.

## Other known gaps (filled in as later phases land)

- Module B/C accuracy figures depend on the small local models used
  (`distilgpt2`/`gpt2`, HC3-trained classifier) — see `docs/benchmark.md`
  once populated in Phase 5/7.
- Conformal prediction intervals (Module C) have a documented coverage
  guarantee under exchangeability assumptions that may not hold for text
  far outside the calibration set's distribution.
