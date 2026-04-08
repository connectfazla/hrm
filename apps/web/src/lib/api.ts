export type ApiError = {
  message?: string;
};

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const headers: Record<string, string> = {};
  if (init?.headers) {
    // Normalize HeadersInit into a plain record for easy mutation.
    if (init.headers instanceof Headers) {
      init.headers.forEach((v, k) => (headers[k] = v));
    } else if (Array.isArray(init.headers)) {
      for (const [k, v] of init.headers) headers[k] = v;
    } else {
      Object.assign(headers, init.headers);
    }
  }

  let body: BodyInit | undefined =
    init?.body === null || init?.body === undefined ? undefined : init.body;
  if (init?.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    body,
    credentials: 'include',
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as ApiError;
      if (data?.message) msg = data.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

