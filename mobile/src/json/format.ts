export type JsonFormatResult =
  | { ok: true; value: unknown; pretty: string; minified: string }
  | { ok: false; error: string };

export function parseAndFormatJson(raw: string): JsonFormatResult {
  try {
    const value = JSON.parse(raw);
    return {
      ok: true,
      value,
      pretty: JSON.stringify(value, null, 2),
      minified: JSON.stringify(value),
    };
  } catch (error) {
    return {
      ok: false,
      error: (error as Error).message,
    };
  }
}
