'use client';

import { useState } from 'react';
import { ApiError, checkProvenance, type ProvenanceResponse } from '@/lib/api';
import { C2paCard } from './C2paCard';
import { ExifTable } from './ExifTable';
import { DocLink, PageHeader, PageShell, Section } from '../ui';

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
    <PageShell>
      <PageHeader
        letter="D"
        lede="Checks an image for signed Content Credentials: a tamper-evident record of who made it and how it was edited. No guessing involved, the signature either verifies or it doesn't."
      >
        <p>
          Unlike every other module here, this one infers nothing statistically. It verifies a{' '}
          <a href="https://c2pa.org/" className="link">
            C2PA
          </a>{' '}
          manifest with the official SDK, if the file has one.
        </p>
        <p>
          It also shows raw EXIF metadata for context. EXIF is unsigned and freely editable, so it
          is shown as-is and never treated as a provenance claim.{' '}
          <DocLink doc="architecture.md">Design notes</DocLink>.
        </p>
      </PageHeader>

      <section className="panel flex flex-col gap-4">
        <label className="label">
          Image
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="field-file"
          />
        </label>
        <p className="muted">JPEG, PNG or WebP, up to 20 MB.</p>
        <button onClick={handleRun} disabled={busy || !file} className="btn btn-primary">
          {busy ? 'Checking…' : 'Check provenance'}
        </button>
        {error && <p className="error-msg">{error}</p>}
      </section>

      {!result && !error && (
        <p className="empty">
          Results appear here: whether the image carries valid Content Credentials, who signed them,
          and its raw metadata.
        </p>
      )}

      {result && (
        <>
          <Section title="Content Credentials (C2PA)">
            <C2paCard c2pa={result.c2pa} />
          </Section>

          <Section title="EXIF metadata" description="Raw and unsigned, shown for context only.">
            <ExifTable exif={result.exif} />
          </Section>
        </>
      )}
    </PageShell>
  );
}
