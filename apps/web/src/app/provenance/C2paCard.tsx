import type { C2paInfo, C2paStatus } from '@/lib/api';
import { Chip, Stat, type Tone } from '../ui';

const STATUS: Record<C2paStatus, { tone: Tone; label: string }> = {
  valid: { tone: 'signal', label: 'Signed and verified' },
  invalid: { tone: 'alert', label: 'Signed but tampered' },
  'no-manifest': { tone: 'neutral', label: 'No Content Credentials found' },
  unsupported: { tone: 'caution', label: "Couldn't read this file" },
};

export function C2paCard({ c2pa }: { c2pa: C2paInfo }) {
  return (
    <div className="panel flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Chip tone={STATUS[c2pa.status].tone}>{STATUS[c2pa.status].label}</Chip>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          A cryptographic check, not a statistical guess
        </span>
      </div>

      {(c2pa.status === 'valid' || c2pa.status === 'invalid') && (
        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Stat label="Title" value={c2pa.title ?? '—'} />
          <Stat label="Signed by" value={c2pa.signatureIssuer ?? '—'} />
          <Stat label="Signed at" value={c2pa.signedAt ?? '—'} />
          <Stat label="Claim generator" value={c2pa.claimGenerator ?? '—'} />
        </dl>
      )}

      {c2pa.failures.length > 0 && (
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">Validation notes</span>
          <ul className="list-inside list-disc font-mono text-xs text-rose-700 dark:text-rose-400">
            {c2pa.failures.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {c2pa.status === 'no-manifest' && (
        <p className="muted">
          This only means the file carries no C2PA manifest. It says nothing about whether the image
          is AI-generated.
        </p>
      )}
    </div>
  );
}
