# Dataset

## HC3 (Module C training data, Phase 5)

- **Source**: [Hello-SimpleAI/HC3](https://huggingface.co/datasets/Hello-SimpleAI/HC3)
  on Hugging Face, `all` config (English; combines finance, medicine,
  open_qa, reddit_eli5, and wiki_csai sources — 24,322 question/answer
  rows). Introduced in Guo et al., ["How Close is ChatGPT to Human
  Experts?"](https://arxiv.org/abs/2301.07597) (2023).
- **License**: CC-BY-SA 4.0 (per the dataset's Hugging Face card). This
  project's use — training a small classifier and publishing the resulting
  model parameters and aggregate evaluation numbers, not redistributing
  the dataset itself — is consistent with that license; the dataset is
  never bundled in this repo (see below).
- **Fetched by** `apps/api/scripts/prepare_hc3.py`, via the
  `datasets-server.huggingface.co` REST API (plain JSON over HTTP — no
  `datasets`/pyarrow dependency needed for this). Each of the five source
  configs is capped independently (default 400 rows each) rather than
  pulling all 24k rows of `all` — reddit_eli5 alone is ~70% of that config,
  so capping per-source keeps the resulting dataset balanced across
  domains and training fast on a laptop.
- **Preprocessing**: from each row, the first human answer and first
  ChatGPT answer are each kept as one labeled example (human=0, ai=1),
  skipping answers under 20 words (too short for the stylometric features
  in `app/classifier/features.py` to carry much signal). Split into
  train/calibration/test (60/20/20, seeded) **by question id**, so a
  question's human and AI answers never land in different splits.
- **Not bundled in this repo**: running `prepare_hc3.py` writes
  `apps/api/data/classifier/{train,calibration,test}.csv`, which is
  gitignored. The script must be re-run (network access required) to
  reproduce or retrain — see `apps/api/README.md`.

No copyrighted text is scraped or embedded as demo data anywhere in this
project — see the root README's disclaimers. HC3's human answers are
themselves drawn from public Q&A sources (Reddit ELI5, WikiQA, etc.) under
the dataset's own license, not scraped independently by this project.
