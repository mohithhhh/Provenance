/**
 * Batch mode (Module E extension, Phase 9) input/output.
 *
 * Input parsing is deliberately not a full RFC 4180 CSV parser — each line
 * is one whole text to analyze, so there's no field-delimiter ambiguity to
 * resolve (a text containing a comma is still just one line, one text).
 * Output *does* need real CSV quoting, since result fields (verdicts,
 * scores) sit in genuine columns next to the original text.
 */

/** Splits pasted/uploaded text into one entry per non-blank line, dropping
 * a leading "text" header if the input looks like a one-column CSV with a
 * header row. */
export function parseLines(input: string): string[] {
  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines[0]?.toLowerCase() === 'text') {
    return lines.slice(1);
  }
  return lines;
}

function escapeField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Renders records as CSV text (header + one row per record), quoting only
 * the fields that need it. Generic over the record shape so a concrete
 * interface (no index signature required) can be passed directly. */
export function toCsv<T extends object>(records: T[], columns: (keyof T)[]): string {
  const lines: string[] = [columns.map(String).join(',')];
  for (const record of records) {
    lines.push(columns.map((col) => escapeField(String(record[col] ?? ''))).join(','));
  }
  return lines.join('\r\n');
}
