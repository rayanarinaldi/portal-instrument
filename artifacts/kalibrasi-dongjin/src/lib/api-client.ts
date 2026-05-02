/**
 * Central API client for Dongjin frontend.
 *
 * Local:
 *   VITE_API_URL=http://localhost:3000
 *
 * Production:
 *   VITE_API_URL=https://your-api.onrender.com
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

type ApiOptions = RequestInit & {
  json?: unknown;
};

export async function apiFetch<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof data === "object" && data && "message" in data
      ? String((data as { message: unknown }).message)
      : `API error ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
