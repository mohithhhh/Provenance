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
import { Chip, DocLink, PageHeader, PageShell, Section } from '../ui';

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
    <PageShell>
      <PageHeader
        letter="F"
        lede="Log text here, then check a reworded version of it later. Matching on meaning rather than exact words survives paraphrasing that breaks the statistical detectors."
      >
        <p>
          <strong className="font-medium text-zinc-800 dark:text-zinc-200">
            This only recognizes text that was logged here first.
          </strong>{' '}
          It is not a general AI-content detector and cannot identify arbitrary text it never saw.
        </p>
        <p>
          Entries are compared by embedding similarity, brute-force over the whole log, which is the
          right tradeoff at this scale. <DocLink doc="limitations.md">Read the limitations</DocLink>
          .
        </p>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Log" description="Record text as if this suite had generated it.">
          <div className="panel flex flex-1 flex-col gap-4">
            <textarea
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              rows={5}
              aria-label="Text to log"
              placeholder="Paste text to log"
              className="field"
            />
            <label className="label">
              Source label
              <input
                type="text"
                value={logSource}
                onChange={(e) => setLogSource(e.target.value)}
                className="field"
              />
            </label>
            <button
              onClick={handleLog}
              disabled={logBusy || logText.trim().length === 0}
              className="btn btn-primary"
            >
              {logBusy ? 'Logging…' : 'Log to ledger'}
            </button>
            {logStatus && (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{logStatus}</p>
            )}
            {logError && <p className="error-msg">{logError}</p>}
          </div>
        </Section>

        <Section title="Check" description="Paste a paraphrase of something logged to find it.">
          <div className="panel flex flex-1 flex-col gap-4">
            <textarea
              value={checkText}
              onChange={(e) => setCheckText(e.target.value)}
              rows={5}
              aria-label="Text to check against the ledger"
              placeholder="Paste text to check against the ledger"
              className="field"
            />
            <button
              onClick={handleCheck}
              disabled={checkBusy || checkText.trim().length === 0}
              className="btn btn-primary"
            >
              {checkBusy ? 'Checking…' : 'Check ledger'}
            </button>
            {checkError && <p className="error-msg">{checkError}</p>}
          </div>
        </Section>
      </div>

      {checkResult && (
        <Section
          title="Closest entries"
          description={`A match needs at least ${(checkResult.threshold * 100).toFixed(0)}% cosine similarity.`}
          action={
            <Chip tone={checkResult.matched ? 'signal' : 'neutral'}>
              {checkResult.matched ? 'Matched a logged entry' : 'No match'}
            </Chip>
          }
        >
          {checkResult.topMatches.length === 0 ? (
            <p className="empty">The ledger is empty. Log something first.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {checkResult.topMatches.map((m) => (
                <EntryCard
                  key={m.id}
                  id={m.id}
                  source={m.source}
                  createdAt={m.createdAt}
                  snippet={m.snippet}
                  similarity={m.similarity}
                  threshold={checkResult.threshold}
                />
              ))}
            </ul>
          )}
        </Section>
      )}

      <Section
        title="Recent entries"
        action={
          count !== null && (
            <span className="text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
              {count} logged in total
            </span>
          )
        }
      >
        {entriesError && <p className="error-msg">{entriesError}</p>}
        {entries && entries.length === 0 && !entriesError && (
          <p className="empty">Nothing logged yet. Text you log above will be listed here.</p>
        )}
        {entries && entries.length > 0 && (
          <ul className="flex flex-col gap-2">
            {entries.map((e) => (
              <EntryCard
                key={e.id}
                id={e.id}
                source={e.source}
                createdAt={e.createdAt}
                snippet={e.snippet}
              />
            ))}
          </ul>
        )}
      </Section>
    </PageShell>
  );
}

function EntryCard({
  id,
  source,
  createdAt,
  snippet,
  similarity,
  threshold,
}: {
  id: number;
  source: string;
  createdAt: string;
  snippet: string;
  similarity?: number;
  threshold?: number;
}) {
  return (
    <li className="panel flex flex-col gap-2 py-4 sm:py-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Entry {id}</span>
          <span>{source}</span>
          <span>{formatTime(createdAt)}</span>
        </span>
        {similarity !== undefined && (
          <span
            className={`font-medium tabular-nums ${
              threshold !== undefined && similarity >= threshold
                ? 'text-emerald-700 dark:text-emerald-400'
                : ''
            }`}
          >
            {(similarity * 100).toFixed(1)}% similar
          </span>
        )}
      </div>
      <p className="font-mono text-sm leading-6 text-zinc-700 dark:text-zinc-300">{snippet}</p>
    </li>
  );
}
