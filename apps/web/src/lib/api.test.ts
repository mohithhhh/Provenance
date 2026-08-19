import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, checkLedger, ledgerStats, listLedgerEntries, logToLedger } from './api';

describe('api client', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('throws a friendly ApiError when the network request itself fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    await expect(logToLedger('hello', 'manual')).rejects.toThrow(ApiError);
    await expect(logToLedger('hello', 'manual')).rejects.toThrow(/is it running/i);
  });

  it('throws ApiError with the status and body on a non-OK response', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('bad request detail', { status: 422 }));
    await expect(checkLedger('hello')).rejects.toThrow(/422/);
  });

  it('logToLedger posts to /ledger/log with the given text and source', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 1, createdAt: 'now' }), { status: 200 }),
      );
    global.fetch = fetchMock;

    const result = await logToLedger('hello world', 'manual');

    expect(result).toEqual({ id: 1, createdAt: 'now' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/\/ledger\/log$/);
    expect(JSON.parse(init.body)).toEqual({ text: 'hello world', source: 'manual' });
  });

  it('checkLedger omits threshold from the body when not provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ matched: false, threshold: 0.85, bestMatch: null, topMatches: [] }),
        {
          status: 200,
        },
      ),
    );
    global.fetch = fetchMock;

    await checkLedger('hello');

    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(init.body)).toEqual({ text: 'hello' });
  });

  it('listLedgerEntries includes the limit as a query param', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    global.fetch = fetchMock;

    await listLedgerEntries(5);

    const [url] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/\/ledger\?limit=5$/);
  });

  it('ledgerStats hits /ledger/stats', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ count: 3 }), { status: 200 }));
    global.fetch = fetchMock;

    const result = await ledgerStats();

    expect(result).toEqual({ count: 3 });
    const [url] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/\/ledger\/stats$/);
  });
});
