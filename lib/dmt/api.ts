export function describeApiError(body: unknown, status: number): string {
  if (!body || typeof body !== 'object') return `Request failed: ${status}`;
  const payload = body as {error?: unknown; message?: unknown};
  if (typeof payload.message === 'string' && payload.message.trim()) return payload.message;
  const err = payload.error;
  if (typeof err === 'string' && err.trim()) return err;
  if (err && typeof err === 'object') {
    const msg = (err as {message?: unknown}).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
    try {
      return JSON.stringify(err);
    } catch {
      return `Request failed: ${status}`;
    }
  }
  return `Request failed: ${status}`;
}

export async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {'content-type': 'application/json', ...(init?.headers ?? {})},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(describeApiError(body, res.status));
    (error as Error & {status?: number; body?: unknown}).status = res.status;
    (error as Error & {status?: number; body?: unknown}).body = body;
    throw error;
  }
  return res.json() as Promise<T>;
}
