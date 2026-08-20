import type { Metadata } from 'next';
import Link from 'next/link';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Provenance',
  description:
    'A multi-method AI-content detection suite — watermarking, statistical, and classifier-based detectors with an honest, disagreement-aware ensemble.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white text-zinc-900 dark:bg-black dark:text-zinc-100">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-semibold tracking-tight">
              Provenance
            </Link>
            <nav className="flex gap-5 text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/watermark" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Watermark Lab
              </Link>
              <Link href="/ledger" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Ledger
              </Link>
              <Link href="/detect" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Statistical Detector
              </Link>
              <a
                href="https://github.com/mohithhhh/Provenance"
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
