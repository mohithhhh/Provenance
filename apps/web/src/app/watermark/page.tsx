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
import { ApiError, logToLedger } from '@/lib/api';
import { TokenView } from './TokenView';
import { DocLink, PageHeader, PageShell, Section } from '../ui';
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

  const [ledgerStatus, setLedgerStatus] = useState<string | null>(null);
  const [ledgerBusy, setLedgerBusy] = useState(false);

  async function sendGeneratedToLedger() {
    if (!generated) return;
    setLedgerBusy(true);
    setLedgerStatus(null);
    try {
      const result = await logToLedger(generated.text, scheme);
      setLedgerStatus(`Logged as ledger entry #${result.id}.`);
    } catch (err) {
      setLedgerStatus(err instanceof ApiError ? err.message : String(err));
    } finally {
      setLedgerBusy(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        letter="A"
        lede="Generate text carrying a hidden statistical watermark, then test any text for it. Only someone holding the same key can find the signal."
      >
        <p>
          Original, independent implementations of two published watermarking algorithms: the
          Kirchenbauer et al. (2023) green-list scheme, and the Aaronson/Kuditipudi et al. Gumbel
          (exponential-minimum-sampling) scheme.
        </p>
        <p>
          Text comes from a small, hand-built toy grammar, not a real language model. The point is
          the watermark signal, not fluent prose. This cannot detect any vendor&apos;s real
          production watermark. <DocLink doc="limitations.md">Read the limitations</DocLink>.
        </p>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-4">
        <div className="segmented" role="group" aria-label="Watermarking scheme">
          {(['greenlist', 'gumbel'] as const).map((s) => (
            <button key={s} aria-pressed={scheme === s} onClick={() => setScheme(s)}>
              {s === 'greenlist' ? 'Green-list' : 'Gumbel'}
            </button>
          ))}
        </div>
        <Link href="/watermark/robustness" className="link text-sm">
          How it holds up under attack
        </Link>
      </div>

      <Section
        title="Generate"
        description="The key seeds which words count as green. Higher bias strength pushes harder toward green words: easier to detect, more distorted text."
      >
        <div className="panel flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="label">
              Key
              <input
                type="text"
                value={genKey}
                onChange={(e) => setGenKey(e.target.value)}
                className="field"
                placeholder="secret shared between generator and detector"
              />
            </label>
            <label className="label">
              <span>
                Length{' '}
                <span className="font-normal text-zinc-500 tabular-nums">{length} words</span>
              </span>
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
                <label className="label">
                  <span>
                    Green-list fraction (γ){' '}
                    <span className="font-normal text-zinc-500 tabular-nums">
                      {gamma.toFixed(2)}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={0.1}
                    max={0.9}
                    step={0.05}
                    value={gamma}
                    onChange={(e) => setGamma(Number(e.target.value))}
                  />
                </label>
                <label className="label">
                  <span>
                    Bias strength (δ){' '}
                    <span className="font-normal text-zinc-500 tabular-nums">
                      {delta.toFixed(1)}
                    </span>
                  </span>
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
          <button onClick={handleGenerate} className="btn btn-primary">
            Generate watermarked text
          </button>
          {generateError && <p className="error-msg">{generateError}</p>}
        </div>
        {generated && (
          <div className="panel flex flex-col gap-4">
            <TokenView tokens={generatedToChips(generated, scheme)} />
            <div className="flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <button onClick={sendGeneratedToDetector} className="btn btn-secondary btn-sm">
                Send to detector
              </button>
              <button
                onClick={sendGeneratedToLedger}
                disabled={ledgerBusy}
                className="btn btn-secondary btn-sm"
              >
                {ledgerBusy ? 'Logging…' : 'Log to the ledger'}
              </button>
              {ledgerStatus && <span className="muted">{ledgerStatus}</span>}
            </div>
          </div>
        )}
      </Section>

      <Section
        title="Detect"
        description="Paste any text. Detection needs the same key, and for green-list the same γ, that generated it."
      >
        <div className="panel flex flex-col gap-5">
          <textarea
            value={detectText}
            onChange={(e) => setDetectText(e.target.value)}
            rows={5}
            aria-label="Text to check for a watermark"
            placeholder="Paste text to check, or send the generated text above"
            className="field"
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="label">
              Key
              <input
                type="text"
                value={detectKey}
                onChange={(e) => setDetectKey(e.target.value)}
                className="field"
              />
            </label>
            {scheme === 'greenlist' && (
              <label className="label">
                <span>
                  Green-list fraction (γ){' '}
                  <span className="font-normal text-zinc-500 tabular-nums">
                    {detectGamma.toFixed(2)}
                  </span>
                </span>
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
            className="btn btn-primary"
          >
            Run detector
          </button>
          {detectError && <p className="error-msg">{detectError}</p>}
        </div>
        {detectResult && (
          <>
            <VerdictCard
              zScore={detectResult.zScore}
              pValue={detectResult.pValue}
              greenCount={detectResult.greenCount}
              totalScored={detectResult.totalScored}
              totalTokens={detectResult.totalTokens}
              verdict={detectResult.verdict}
            />
            <div className="panel">
              <TokenView tokens={detectedToChips(detectResult, scheme)} />
            </div>
          </>
        )}
      </Section>
    </PageShell>
  );
}
