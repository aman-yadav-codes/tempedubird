export async function readJsonResponse<T = Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;

  const trimmed = text.trim();
  if (trimmed.startsWith("<")) {
    return {
      error: res.ok ? "Invalid API response" : `Unexpected API response (${res.status})`,
    } as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return {
      error: res.ok ? "Invalid API response" : `Unexpected API response (${res.status})`,
    } as T;
  }
}

