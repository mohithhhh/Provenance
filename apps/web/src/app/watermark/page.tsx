'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  detectGreenListText,
  detectGumbelText,
  generateGreenListText,
  generateGumbelText,
  type DetectResult,
  type GenerateResult,
} from '@provenance/watermark-core';
import { TokenView } from './TokenView';
import { VerdictCard } from './VerdictCard';
import { detectedToChips, generatedToChips, type Scheme } from './chips';

export default function WatermarkLabPage() {
  const [scheme, setScheme] = useState<Scheme>('greenlist');
  const [genKey, setGenKey] = useState('demo-key');
  const [gamma, setGamma] = useState(0.5);
  const [delta, setDelta] = useState(2);
  const [length, setLength] = useState(60);
  const [generated, setGenerated] = useState<GenerateResult | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [detectText, setDetectText] = useState('');
  const [detectKey, setDetectKey] = useState('demo-key');
  const [detectGamma, setDetectGamma] = useState(0.5);
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null);
  const [detectError, setDetectError] = useState<string | null>(null);

  function handleGenerate() {
    setGenerateError(null);
    try {
      const result =
        scheme === 'greenlist'
          ? generateGreenListText({ key: genKey, gamma, delta, length })
          : generateGumbelText({ key: genKey, length });
      setGenerated(result);
    } catch (err) {
      setGenerated(null);
      setGenerateError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleDetect() {
    setDetectError(null);
    try {
      const result =
        scheme === 'greenlist'
          ? detectGreenListText(detectText, { key: detectKey, gamma: detectGamma })
          : detectGumbelText(detectText, { key: detectKey });
      setDetectResult(result);
    } catch (err) {
      setDetectResult(null);
      setDetectError(err instanceof Error ? err.message : String(err));
    }
  }

  function sendGeneratedToDetector() {
    if (!generated) return;
    setDetectText(generated.text);
    setDetectKey(genKey);
    setDetectGamma(gamma);
    setDetectResult(null);
    setDetectError(null);
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Watermark Lab</h1>
        <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Original, independent implementations of two published LLM watermarking algorithms — the
          Kirchenbauer et al. (2023) green-list scheme, and the Aaronson/Kuditipudi et al. Gumbel
          (exponential-minimum-sampling) scheme. Text is produced by a small, hand-built toy
          grammar, not a real language model — the point here is the watermark signal, not fluent
          prose. This cannot detect any vendor&apos;s real production watermark; see{' '}
          <a
            href="https://github.com/mohithhhh/Provenance/blob/main/docs/limitations.md"
            className="underline underline-offset-2"
          >
            docs/limitations.md
          </a>
          .
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex w-fit gap-1 rounded-full border border-zinc-200 p-1 text-sm dark:border-zinc-800">
            {(['greenlist', 'gumbel'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScheme(s)}
                className={`rounded-full px-3 py-1 transition ${
                  scheme === s
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                {s === 'greenlist' ? 'Green-list' : 'Gumbel'}
              </button>
            ))}
          </div>
          <Link
            href="/watermark/robustness"
            className="text-sm text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Robustness Lab →
          </Link>
        </div>
      </div>

      {/* Generate */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Generate</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Key
            <input
              type="text"
              value={genKey}
              onChange={(e) => setGenKey(e.target.value)}
              className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
              placeholder="secret shared between generator and detector"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Length (words): {length}
            <input
              type="range"
              min={20}
              max={200}
              step={10}
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
            />
          </label>
          {scheme === 'greenlist' && (
            <>
              <label className="flex flex-col gap-1 text-sm">
                Gamma (green-list fraction): {gamma.toFixed(2)}
                <input
                  type="range"
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={gamma}
                  onChange={(e) => setGamma(Number(e.target.value))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Delta (green-list bias strength): {delta.toFixed(1)}
                <input
                  type="range"
                  min={0}
                  max={8}
                  step={0.5}
                  value={delta}
                  onChange={(e) => setDelta(Number(e.target.value))}
                />
              </label>
            </>
          )}
        </div>
        <button
          onClick={handleGenerate}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Generate watermarked text
        </button>
        {generateError && (
          <p className="text-sm text-rose-600 dark:text-rose-400">{generateError}</p>
        )}
        {generated && (
          <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <TokenView tokens={generatedToChips(generated, scheme)} />
            <button
              onClick={sendGeneratedToDetector}
              className="w-fit text-sm text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Send to detector below ↓
            </button>
          </div>
        )}
      </section>

      {/* Detect */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Detect</h2>
        <textarea
          value={detectText}
          onChange={(e) => setDetectText(e.target.value)}
          rows={5}
          placeholder="Paste text to check — watermarked toy output, or anything else"
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 font-mono text-sm dark:border-zinc-700"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Key
            <input
              type="text"
              value={detectKey}
              onChange={(e) => setDetectKey(e.target.value)}
              className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            />
          </label>
          {scheme === 'greenlist' && (
            <label className="flex flex-col gap-1 text-sm">
              Gamma: {detectGamma.toFixed(2)}
              <input
                type="range"
                min={0.1}
                max={0.9}
                step={0.05}
                value={detectGamma}
                onChange={(e) => setDetectGamma(Number(e.target.value))}
              />
            </label>
          )}
        </div>
        <button
          onClick={handleDetect}
          disabled={detectText.trim().length === 0}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Run detector
        </button>
        {detectError && <p className="text-sm text-rose-600 dark:text-rose-400">{detectError}</p>}
        {detectResult && (
          <div className="flex flex-col gap-4">
            <VerdictCard
              zScore={detectResult.zScore}
              pValue={detectResult.pValue}
              greenCount={detectResult.greenCount}
              totalScored={detectResult.totalScored}
              totalTokens={detectResult.totalTokens}
              verdict={detectResult.verdict}
            />
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <TokenView tokens={detectedToChips(detectResult, scheme)} />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
