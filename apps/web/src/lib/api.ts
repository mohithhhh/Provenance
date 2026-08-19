/**
 * Client for apps/api. Unlike Module A (pure client-side), Module F needs a
 * persistent server-side ledger, so this is the first part of the app that
 * makes a real network call — see apps/api/README.md to run the backend.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(
      `Couldn't reach the API at ${API_URL}. Is it running? See apps/api/README.md.`,
    );
  }
  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(`API returned ${response.status}: ${body}`);
  }
  return response.json() as Promise<T>;
}

export interface LogResponse {
  id: number;
  createdAt: string;
}

export function logToLedger(text: string, source: string): Promise<LogResponse> {
  return request<LogResponse>('/ledger/log', {
    method: 'POST',
    body: JSON.stringify({ text, source }),
  });
}

export interface MatchResponse {
  id: number;
  similarity: number;
  snippet: string;
  source: string;
  createdAt: string;
}

export interface CheckResponse {
  matched: boolean;
  threshold: number;
  bestMatch: MatchResponse | null;
  topMatches: MatchResponse[];
}

export function checkLedger(text: string, threshold?: number): Promise<CheckResponse> {
  return request<CheckResponse>('/ledger/check', {
    method: 'POST',
    body: JSON.stringify({ text, ...(threshold !== undefined ? { threshold } : {}) }),
  });
}

export interface EntryResponse {
  id: number;
  snippet: string;
  source: string;
  createdAt: string;
}

export function listLedgerEntries(limit = 20): Promise<EntryResponse[]> {
  return request<EntryResponse[]>(`/ledger?limit=${limit}`);
}

export interface StatsResponse {
  count: number;
}

export function ledgerStats(): Promise<StatsResponse> {
  return request<StatsResponse>('/ledger/stats');
}
