const defaultRedirectPath = "/dashboard";

function isSafeInternalPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") && !/[\u0000-\u001f\u007f]/.test(path);
}

export function safeInternalRedirectPath(value: unknown, fallback = defaultRedirectPath) {
  const safeFallback = isSafeInternalPath(fallback) ? fallback : defaultRedirectPath;
  const path = typeof value === "string" ? value.trim() : "";

  if (!path || !isSafeInternalPath(path)) {
    return safeFallback;
  }

  return path;
}
