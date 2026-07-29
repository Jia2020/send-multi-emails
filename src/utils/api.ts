/**
 * Safely converts any error object, string, or unknown thrown value into a clean display string
 * preventing React Error #31 (Objects are not valid as a React child).
 */
export function toErrorString(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (typeof val.message === 'string') return val.message;
    if (typeof val.error === 'string') return val.error;
    if (val.message && typeof val.message === 'object') return toErrorString(val.message);
    if (val.error && typeof val.error === 'object') return toErrorString(val.error);
    try {
      const json = JSON.stringify(val);
      return json !== '{}' ? json : String(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

/**
 * Helper function to safely send fetch requests to backend API endpoints
 * and handle both JSON responses and unexpected HTML/non-JSON error pages safely
 * without throwing JSON SyntaxError ("Unexpected token 'T'...").
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  try {
    const defaultHeaders: Record<string, string> = {
      Accept: 'application/json',
    };

    if (options?.body && !options.headers) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    const mergedOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options?.headers || {}),
      },
    };

    const res = await fetch(url, mergedOptions);
    const rawText = await res.text();

    let data: T | null = null;
    let isJson = false;

    if (rawText && rawText.trim()) {
      try {
        data = JSON.parse(rawText);
        isJson = true;
      } catch {
        isJson = false;
      }
    }

    if (isJson && data) {
      if (!res.ok) {
        const rawErr = (data as any)?.error ?? (data as any)?.message ?? (data as any)?.details;
        let errorMsg = toErrorString(rawErr);
        if (!errorMsg || errorMsg === '{}') {
          errorMsg = `Server returned error status (${res.status})`;
        }
        return {
          ok: false,
          status: res.status,
          data,
          error: errorMsg,
        };
      }
      return { ok: true, status: res.status, data };
    }

    // Response is not JSON (e.g. HTML 404 page or server error page)
    const strippedText = rawText
      ? rawText.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim()
      : '';

    let friendlyError = `Server returned HTTP ${res.status}`;
    if (strippedText.length > 0) {
      friendlyError = strippedText.slice(0, 150);
    }

    if (!res.ok || !isJson) {
      if (res.status === 404) {
        friendlyError = `Backend API endpoint route not found (${url}). Please verify server status.`;
      } else if (res.status >= 500) {
        friendlyError = `Backend server error (${res.status}): ${friendlyError}`;
      } else if (!isJson) {
        friendlyError = `Server returned invalid response format (${res.status}): ${friendlyError}`;
      }
    }

    return {
      ok: false,
      status: res.status,
      data: null,
      error: friendlyError,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: toErrorString(err?.message || err) || 'Network connection failed. Backend server may be offline.',
    };
  }
}

