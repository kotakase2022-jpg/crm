export type OperationResult<T> =
  | {
      ok: true;
      data: T;
      fallback: false;
    }
  | {
      ok: false;
      data: T;
      error: string;
      fallback: true;
    };

export function normalizeApiError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Unknown external service error";
}

export async function withFallback<T>(operation: () => Promise<T>, fallbackData: T): Promise<OperationResult<T>> {
  try {
    return {
      ok: true,
      data: await operation(),
      fallback: false,
    };
  } catch (error) {
    return {
      ok: false,
      data: fallbackData,
      error: normalizeApiError(error),
      fallback: true,
    };
  }
}

export function formatApiListResponse<T>(rows: T[] | null | undefined, error?: unknown) {
  if (error) {
    return {
      ok: false,
      rows: [] as T[],
      error: normalizeApiError(error),
    };
  }

  return {
    ok: true,
    rows: rows ?? [],
    error: null,
  };
}
