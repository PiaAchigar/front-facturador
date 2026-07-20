import { getAuthToken } from "../lib/auth-token";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";
/** Fallback de auth para correr el biller standalone en dev (sin el dashboard). */
const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const { headers: initHeaders, ...rest } = init ?? {};

  // Embebido en el dashboard: el host manda el JWT del staff (rol real) por
  // postMessage → header `Authorization`. Standalone (dev): cae al API key.
  const auth: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : API_KEY
      ? { "x-api-key": API_KEY }
      : {};

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...auth,
      ...initHeaders,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, (body as { error?: string })?.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}
