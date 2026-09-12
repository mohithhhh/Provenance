import { describe, expect, it } from 'vitest';
import { parseLines, toCsv } from './csv';

describe('parseLines', () => {
  it('splits on newlines and drops empty/whitespace-only lines', () => {
    expect(parseLines('one\ntwo\n\n   \nthree')).toEqual(['one', 'two', 'three']);
  });

  it('trims surrounding whitespace from each line', () => {
    expect(parseLines('  padded line  \nother')).toEqual(['padded line', 'other']);
  });

  it('drops a leading "text" header if present, case-insensitively', () => {
    expect(parseLines('text\nfirst\nsecond')).toEqual(['first', 'second']);
    expect(parseLines('Text\nfirst')).toEqual(['first']);
  });

  it('returns an empty array for empty input', () => {
    expect(parseLines('')).toEqual([]);
    expect(parseLines('   \n  ')).toEqual([]);
  });
});

describe('toCsv', () => {
  it('renders a header row followed by one row per record', () => {
    const csv = toCsv(
      [
        { a: '1', b: '2' },
        { a: '3', b: '4' },
      ],
      ['a', 'b'],
    );
    expect(csv).toBe('a,b\r\n1,2\r\n3,4');
  });

  it('quotes fields containing a comma, quote, or newline', () => {
    const csv = toCsv([{ text: 'hello, world', note: 'has "quotes"' }], ['text', 'note']);
    expect(csv).toBe('text,note\r\n"hello, world","has ""quotes"""');
  });

  it('leaves plain fields unquoted', () => {
    const csv = toCsv([{ text: 'plain text' }], ['text']);
    expect(csv).toBe('text\r\nplain text');
  });
});
