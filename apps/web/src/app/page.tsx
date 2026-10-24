import Link from 'next/link';
import { computeEnsemble } from '@/lib/ensemble';
import { SPLIT_B, SPLIT_C, SPLIT_F_MATCHED } from '@/lib/specimen';
import { ModuleResultsTable, type ModuleResultRow } from './ensemble/ModuleResultsTable';
import { SentenceHeatmap } from './ensemble/SentenceHeatmap';
import { Chip, DocLink, VERDICT_LABEL, VERDICT_TONE } from './ui';

const ensemble = computeEnsemble({
  bVerdict: SPLIT_B.verdict,
  bBinocularsScore: SPLIT_B.binocularsScore,
  cVerdict: SPLIT_C.verdict,
  cAiProbability: SPLIT_C.aiProbability,
  cIntervalLow: SPLIT_C.intervalLow,
  cIntervalHigh: SPLIT_C.intervalHigh,
  cConfidenceLevel: SPLIT_C.confidenceLevel,
});

const pct = (p: number) => `${(p * 100).toFixed(1)}%`;

const READINGS: ModuleResultRow[] = [
  {
    letter: 'B',
    module: 'Statistical detector',
    verdict: SPLIT_B.verdict,
    value: `Binoculars score ${SPLIT_B.binocularsScore.toFixed(3)}`,
  },
  {
    letter: 'C',
    module: 'Trained classifier',
    verdict: SPLIT_C.verdict,
    // Two decimals: 0.9995 at one decimal would claim a flat 100%.
    value: `${(SPLIT_C.aiProbability * 100).toFixed(2)}% AI, 90% interval ${Math.round(SPLIT_C.intervalLow * 100)}–${Math.round(SPLIT_C.intervalHigh * 100)}%`,
  },
  {
    letter: 'F',
    module: 'Retrieval ledger',
    verdict: SPLIT_F_MATCHED ? 'matched' : 'no-match',
    value: 'Only recognizes text this suite has logged',
  },
];

export default function Home() {
  return (
    <main className="relative flex w-full flex-1 flex-col justify-center">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
        <div className="flex flex-col gap-6">
          <h1 className="text-5xl leading-[1.02] font-bold tracking-[-0.025em] text-balance sm:text-6xl">
            AI detectors disagree. Provenance shows you where.
          </h1>
          <p className="max-w-lg text-lg leading-7 text-zinc-700 dark:text-zinc-300">
            Seven independent methods, from watermark tests to a trained classifier, each give their
            own verdict. When they conflict, you see the conflict instead of one confident-looking
            number.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/ensemble" className="btn btn-primary">
              Run your own text
            </Link>
            <Link href="/modules" className="btn btn-secondary">
              Browse the seven modules
            </Link>
          </div>
          <p className="max-w-lg text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Built for research and teaching. It can&apos;t detect any vendor&apos;s production
            watermark or classifier, and AI detection isn&apos;t solved.{' '}
            <DocLink doc="limitations.md">Read the limitations</DocLink>.
          </p>
        </div>

        <figure className="flex flex-col gap-3">
          <div className="panel flex flex-col gap-6 rounded-2xl shadow-[0_24px_48px_-24px_rgba(23,28,33,0.35)] sm:p-7">
            <SentenceHeatmap sentences={SPLIT_B.sentences} />

            <div className="border-y border-zinc-200 dark:border-zinc-800">
              <ModuleResultsTable rows={READINGS} bare revealFromMs={300} />
            </div>

            <div
              className="reveal flex flex-col gap-2"
              style={{ animationDelay: `${300 + READINGS.length * 350 + 150}ms` }}
            >
              <Chip tone={VERDICT_TONE[ensemble.verdict]!}>{VERDICT_LABEL[ensemble.verdict]}</Chip>
              <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                Pooling B and C would print {pct(ensemble.probability)} AI. The ensemble abstains
                instead: when two methods reach opposite verdicts, an average hides the one thing
                worth knowing.
              </p>
            </div>
          </div>
          <figcaption className="px-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            Recorded output from Modules B, C and F on a paragraph written for this page. It&apos;s
            one of the examples on the{' '}
            <Link href="/ensemble" className="link">
              ensemble page
            </Link>
            , so you can re-run it.
          </figcaption>
        </figure>
      </div>
    </main>
  );
}
