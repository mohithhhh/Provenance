'use client';

import { useEffect, useState } from 'react';
import {
  ApiError,
  checkLedger,
  ledgerStats,
  listLedgerEntries,
  logToLedger,
  type CheckResponse,
  type EntryResponse,
} from '@/lib/api';

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function LedgerPage() {
  const [logText, setLogText] = useState('');
  const [logSource, setLogSource] = useState('manual');
  const [logStatus, setLogStatus] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const [logBusy, setLogBusy] = useState(false);

  const [checkText, setCheckText] = useState('');
  const [checkResult, setCheckResult] = useState<CheckResponse | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checkBusy, setCheckBusy] = useState(false);

  const [entries, setEntries] = useState<EntryResponse[] | null>(null);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  async function refreshLedgerView() {
    try {
      const [list, stats] = await Promise.all([listLedgerEntries(10), ledgerStats()]);
      setEntries(list);
      setCount(stats.count);
      setEntriesError(null);
    } catch (err) {
      setEntriesError(err instanceof ApiError ? err.message : String(err));
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, stats] = await Promise.all([listLedgerEntries(10), ledgerStats()]);
        if (cancelled) return;
        setEntries(list);
        setCount(stats.count);
        setEntriesError(null);
      } catch (err) {
        if (cancelled) return;
        setEntriesError(err instanceof ApiError ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLog() {
    setLogBusy(true);
    setLogError(null);
    setLogStatus(null);
    try {
      const result = await logToLedger(logText, logSource || 'manual');
      setLogStatus(`Logged as entry #${result.id} at ${formatTime(result.createdAt)}.`);
      setLogText('');
      await refreshLedgerView();
    } catch (err) {
      setLogError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setLogBusy(false);
    }
  }

  async function handleCheck() {
    setCheckBusy(true);
    setCheckError(null);
    setCheckResult(null);
    try {
      const result = await checkLedger(checkText);
      setCheckResult(result);
    } catch (err) {
      setCheckError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setCheckBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Retrieval Provenance Ledger</h1>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Module F. Log text here, then paste a paraphrase of it below — semantic embedding
          similarity survives paraphrasing far better than exact-match or statistical detectors do.{' '}
          <strong>This only recognizes text that was logged here first.</strong> It is not a general
          AI-content detector and cannot identify arbitrary text it never saw; see{' '}
          <a
            href="https://github.com/mohithhhh/Provenance/blob/main/docs/limitations.md"
            className="underline underline-offset-2"
          >
            docs/limitations.md
          </a>
          .
        </p>
      </div>

      {/* Log */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Log</h2>
        <textarea
          value={logText}
          onChange={(e) => setLogText(e.target.value)}
          rows={4}
          placeholder="Paste text to log as if this suite generated it"
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 font-mono text-sm dark:border-zinc-700"
        />
        <label className="flex w-fit flex-col gap-1 text-sm">
          Source label
          <input
            type="text"
            value={logSource}
            onChange={(e) => setLogSource(e.target.value)}
            className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          />
        </label>
        <button
          onClick={handleLog}
          disabled={logBusy || logText.trim().length === 0}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {logBusy ? 'Logging…' : 'Log to ledger'}
        </button>
        {logStatus && <p className="text-sm text-emerald-700 dark:text-emerald-400">{logStatus}</p>}
        {logError && <p className="text-sm text-rose-600 dark:text-rose-400">{logError}</p>}
      </section>

      {/* Check */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Check</h2>
        <textarea
          value={checkText}
          onChange={(e) => setCheckText(e.target.value)}
          rows={4}
          placeholder="Paste text (e.g. a paraphrase of something you logged above) to check against the ledger"
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 font-mono text-sm dark:border-zinc-700"
        />
        <button
          onClick={handleCheck}
          disabled={checkBusy || checkText.trim().length === 0}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {checkBusy ? 'Checking…' : 'Check ledger'}
        </button>
        {checkError && <p className="text-sm text-rose-600 dark:text-rose-400">{checkError}</p>}
        {checkResult && (
          <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <span
              className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
                checkResult.matched
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
              }`}
            >
              {checkResult.matched ? 'Matched a logged entry' : 'No match'}
            </span>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              Threshold: {checkResult.threshold.toFixed(2)} cosine similarity
            </p>
            {checkResult.topMatches.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-500">
                The ledger is empty, or nothing came back — log something above first.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {checkResult.topMatches.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-col gap-1 rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-500">
                      <span>
                        #{m.id} · {m.source} · {formatTime(m.createdAt)}
                      </span>
                      <span className="font-mono">{(m.similarity * 100).toFixed(1)}%</span>
                    </div>
                    <p className="font-mono text-zinc-700 dark:text-zinc-300">{m.snippet}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Recent entries */}
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-medium">Recent ledger entries</h2>
          {count !== null && (
            <span className="text-xs text-zinc-500 dark:text-zinc-500">{count} total</span>
          )}
        </div>
        {entriesError && <p className="text-sm text-rose-600 dark:text-rose-400">{entriesError}</p>}
        {entries && entries.length === 0 && !entriesError && (
          <p className="text-sm text-zinc-500 dark:text-zinc-500">Nothing logged yet.</p>
        )}
        {entries && entries.length > 0 && (
          <ul className="flex flex-col gap-2">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex flex-col gap-1 rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800"
              >
                <span className="text-xs text-zinc-500 dark:text-zinc-500">
                  #{e.id} · {e.source} · {formatTime(e.createdAt)}
                </span>
                <p className="font-mono text-zinc-700 dark:text-zinc-300">{e.snippet}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
