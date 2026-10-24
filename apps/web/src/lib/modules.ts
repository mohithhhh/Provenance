/** The seven modules, in one place — the module rail, page headers and
 * /modules all read from this. Letters match docs/architecture.md. */
export interface ModuleInfo {
  letter: string;
  name: string;
  short: string;
  href: string;
  summary: string;
  /** Lowercase sentence fragment, shown as "Needs …". */
  needs: string;
}

export const MODULES: ModuleInfo[] = [
  {
    letter: 'A',
    name: 'Watermark Lab',
    short: 'Watermark',
    href: '/watermark',
    summary: 'Embeds a statistical watermark with a secret key, then tests text for it.',
    needs: 'the key the text was generated with',
  },
  {
    letter: 'B',
    name: 'Statistical detector',
    short: 'Statistical',
    href: '/detect',
    summary: 'Measures how predictable the text is to two small language models.',
    needs: 'any text',
  },
  {
    letter: 'C',
    name: 'Trained classifier',
    short: 'Classifier',
    href: '/classify',
    summary: 'Scores writing-style features with a model trained on labelled answers.',
    needs: 'any text',
  },
  {
    letter: 'D',
    name: 'File provenance',
    short: 'File (C2PA)',
    href: '/provenance',
    summary: 'Verifies signed Content Credentials in an image and shows its metadata.',
    needs: 'a JPEG, PNG or WebP image',
  },
  {
    letter: 'E',
    name: 'Ensemble',
    short: 'Ensemble',
    href: '/ensemble',
    summary: 'Runs B, C and F together and abstains when they contradict each other.',
    needs: 'any text',
  },
  {
    letter: 'F',
    name: 'Retrieval ledger',
    short: 'Ledger',
    href: '/ledger',
    summary: 'Recognizes text this suite logged earlier, even after paraphrasing.',
    needs: 'text logged here first',
  },
  {
    letter: 'G',
    name: 'Attack Lab',
    short: 'Attack Lab',
    href: '/attack-lab',
    summary: 'Attacks a text, then reruns A, B, C and F to see which still hold.',
    needs: 'any text',
  },
];

export function moduleByLetter(letter: string): ModuleInfo {
  const m = MODULES.find((x) => x.letter === letter);
  if (!m) throw new Error(`Unknown module ${letter}`);
  return m;
}
