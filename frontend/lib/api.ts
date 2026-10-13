import type { ExtractResponse } from '@/types/task';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Thin API client so components never deal with fetch/timeout details.
 */
export async function extractTasks(notes: string): Promise<ExtractResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/api/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? `Request failed with status ${response.status}`);
    }

    return payload as ExtractResponse;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('The request timed out. Please try again.');
    }
    if (error instanceof TypeError) {
      throw new Error('Cannot reach the API. Is the backend running on port 4000?');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
