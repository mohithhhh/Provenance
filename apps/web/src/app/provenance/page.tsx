'use client';

import { useState } from 'react';
import { ApiError, checkProvenance, type ProvenanceResponse } from '@/lib/api';
import { C2paCard } from './C2paCard';
import { ExifTable } from './ExifTable';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ProvenancePage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ProvenanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRun() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await checkProvenance(file);
      setResult(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">File Provenance</h1>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Module D. Unlike every other module here, this one doesn&apos;t infer anything
          statistically — it verifies a{' '}
          <a href="https://c2pa.org/" className="underline underline-offset-2">
            C2PA
          </a>{' '}
          Content Credentials manifest, a cryptographically signed record of an image&apos;s edit
          history, if the file has one. It also surfaces raw EXIF metadata for context — unsigned
          and freely editable, so shown as-is, never as a provenance claim. See{' '}
          <a
            href="https://github.com/mohithhhh/Provenance/blob/main/docs/architecture.md"
            className="underline underline-offset-2"
          >
            docs/architecture.md
          </a>
          .
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <input
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <button
          onClick={handleRun}
          disabled={busy || !file}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {busy ? 'Checking…' : 'Check provenance'}
        </button>
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      </section>

      {result && (
        <>
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">C2PA manifest</h2>
            <C2paCard c2pa={result.c2pa} />
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">EXIF metadata</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">
              Raw and unsigned — shown for context, not verified.
            </p>
            <ExifTable exif={result.exif} />
          </section>
        </>
      )}
    </main>
  );
}
