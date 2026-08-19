export interface TokenChip {
  word: string;
  tone: 'green' | 'red' | 'neutral';
  /** Dimmed + annotated — used for repeat tokens excluded from the z-test. */
  muted?: boolean;
  title?: string;
}

const TONE_CLASSES: Record<TokenChip['tone'], string> = {
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  red: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  neutral: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500',
};

/** Renders a token stream as inline highlighted chips — green-list/red-list
 * membership (or, for Gumbel, "above/below median r"), or gray for words
 * outside the toy vocabulary. Punctuation attaches to the previous word. */
export function TokenView({ tokens }: { tokens: TokenChip[] }) {
  return (
    <p className="font-mono text-sm leading-8">
      {tokens.map((t, i) => {
        if (t.word === '.') {
          return (
            <span key={i} className="mr-1">
              .
            </span>
          );
        }
        return (
          <span
            key={i}
            title={t.title}
            className={`mr-1 inline-block rounded px-1.5 py-0.5 ${TONE_CLASSES[t.tone]} ${
              t.muted ? 'opacity-40' : ''
            }`}
          >
            {t.word}
          </span>
        );
      })}
    </p>
  );
}
