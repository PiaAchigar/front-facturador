import { getAuthToken } from "../lib/auth-token";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";
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
  // Embebido en el dashboard: el host manda el JWT del staff (rol real) por
  // postMessage → header `Authorization`. Standalone (dev): cae al API key.
  const token = getAuthToken();
  const { headers: initHeaders, ...rest } = init ?? {};

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : API_KEY
          ? { "x-api-key": API_KEY }
          : {}),
      ...initHeaders,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, (body as { error?: string })?.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}
