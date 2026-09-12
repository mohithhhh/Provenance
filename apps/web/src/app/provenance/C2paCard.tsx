import type { C2paInfo, C2paStatus } from '@/lib/api';

const STATUS_STYLES: Record<C2paStatus, string> = {
  valid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  invalid: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  'no-manifest': 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
  unsupported: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
};

const STATUS_LABELS: Record<C2paStatus, string> = {
  valid: 'Signed — verified',
  invalid: 'Signed — tampered',
  'no-manifest': 'No Content Credentials found',
  unsupported: "Couldn't read this file",
};

export function C2paCard({ c2pa }: { c2pa: C2paInfo }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[c2pa.status]}`}
        >
          {STATUS_LABELS[c2pa.status]}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
          Cryptographically verified — not a statistical inference
        </span>
      </div>

      {(c2pa.status === 'valid' || c2pa.status === 'invalid') && (
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500 dark:text-zinc-500">Title</dt>
            <dd className="font-mono">{c2pa.title ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-500">Signed by</dt>
            <dd className="font-mono">{c2pa.signatureIssuer ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-500">Signed at</dt>
            <dd className="font-mono">{c2pa.signedAt ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-500">Claim generator</dt>
            <dd className="font-mono">{c2pa.claimGenerator ?? '—'}</dd>
          </div>
        </dl>
      )}

      {c2pa.failures.length > 0 && (
        <div className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-500 dark:text-zinc-500">Validation notes</span>
          <ul className="list-inside list-disc font-mono text-xs text-rose-600 dark:text-rose-400">
            {c2pa.failures.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {c2pa.status === 'no-manifest' && (
        <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-500">
          This just means no C2PA manifest was found — it says nothing about whether the image is
          AI-generated or not.
        </p>
      )}
    </div>
  );
}
