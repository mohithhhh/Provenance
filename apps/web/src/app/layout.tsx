import type { Metadata } from 'next';
import Link from 'next/link';
import { Bricolage_Grotesque, Instrument_Sans, Spline_Sans_Mono } from 'next/font/google';
import { DotGridBackground } from './DotGridBackground';
import { GithubIcon, LogoIcon } from './Icons';
import './globals.css';

// Display: Bricolage Grotesque — ink-trapped, print-era grotesque whose
// optical-size axis turns expressive at headline sizes; it carries headings,
// module letters and readings. Body: Instrument Sans, crisp and slightly
// condensed. Evidence (analyzed text, tokens, feature names): Spline Sans
// Mono, so the specimen reads as an exhibit rather than prose.
const display = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  axes: ['opsz', 'wdth'],
});

const body = Instrument_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  axes: ['wdth'],
});

const mono = Spline_Sans_Mono({
  variable: '--font-evidence',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Provenance',
  description:
    'A multi-method AI-content detection suite — watermarking, statistical, and classifier-based detectors with an honest, disagreement-aware ensemble.',
};

// [href, label, shown on phones]. Every module is also one tap away via the
// A–G rail at the top of each tool page.
const NAV: [string, string, boolean][] = [
  ['/modules', 'Modules', true],
  ['/ensemble', 'Ensemble', true],
  ['/attack-lab', 'Attack Lab', false],
  ['/batch', 'Batch', false],
  ['/benchmark', 'Benchmark', false],
];

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <DotGridBackground />
        <header className="sticky top-0 z-10 border-b border-zinc-200/70 bg-white/70 backdrop-blur-md dark:border-zinc-800/70 dark:bg-zinc-950/70">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link
              href="/"
              className="font-display flex items-center gap-2 text-lg font-semibold tracking-tight"
            >
              <LogoIcon className="h-6 w-6 text-accent-600 dark:text-accent-500" />
              Provenance
            </Link>
            <nav className="flex items-center gap-5 text-sm text-zinc-600 dark:text-zinc-400">
              {NAV.map(([href, label, always]) => (
                <Link
                  key={href}
                  href={href}
                  className={`hover:text-zinc-900 dark:hover:text-zinc-100 ${always ? '' : 'hidden md:inline'}`}
                >
                  {label}
                </Link>
              ))}
              <a
                href="https://github.com/mohithhhh/Provenance"
                className="btn btn-secondary btn-sm hidden sm:inline-flex"
              >
                <GithubIcon className="h-4 w-4" />
                GitHub
              </a>
            </nav>
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="border-t border-zinc-200/70 dark:border-zinc-800/70">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between dark:text-zinc-400">
            <p>
              Provenance is an open-source research project. It is not affiliated with any detector
              or model vendor.
            </p>
            <div className="flex gap-5">
              <a
                href="https://github.com/mohithhhh/Provenance/blob/main/docs/limitations.md"
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Limitations
              </a>
              <Link href="/benchmark" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Benchmark
              </Link>
              <a
                href="https://github.com/mohithhhh/Provenance"
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Source
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
