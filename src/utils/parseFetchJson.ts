const PREVIEW_LENGTH = 200;

export async function parseJsonFromResponse<T>(
  response: Response,
  context: string,
): Promise<T> {
  const text = await response.text();
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    throw new Error(`${context}: empty response body`);
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch (error) {
    const preview = trimmed.slice(0, PREVIEW_LENGTH).replace(/\s+/g, " ");
    const suffix = trimmed.length > PREVIEW_LENGTH ? "…" : "";
    const detail = error instanceof Error ? error.message : String(error);
    const wrapped = new Error(
      `${context}: invalid JSON (${detail}). Response starts with: ${preview}${suffix}`,
    );
    (wrapped as Error & { cause?: unknown }).cause = error;
    throw wrapped;
  }
}
