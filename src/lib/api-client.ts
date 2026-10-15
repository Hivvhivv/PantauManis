/** Pemanggil API sisi browser dengan format error seragam. */
export type ApiError = { code: string; message: string; fields: Record<string, string> };
type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError; status: number };

export async function api<T = unknown>(
  url: string,
  init: { method?: string; body?: unknown; form?: FormData } = {},
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? (init.body || init.form ? "POST" : "GET"),
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
      credentials: "same-origin",
    });
  } catch {
    return {
      ok: false,
      status: 0,
      error: {
        code: "NETWORK",
        message: "Tidak dapat terhubung. Periksa koneksi internet Anda.",
        fields: {},
      },
    };
  }
  const data = await res.json().catch(() => null);
  if (res.ok) return { ok: true, data: data as T };
  const error: ApiError = data?.error ?? {
    code: "UNKNOWN",
    message: "Terjadi kesalahan. Coba lagi.",
    fields: {},
  };
  return { ok: false, error, status: res.status };
}
