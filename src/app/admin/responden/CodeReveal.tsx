"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";

/** Kode tersamar dengan tombol Tampilkan dan Salin. Setiap pembukaan dicatat di server (ADR-004). */
export function CodeReveal({ id, maskedCode }: { id: string; maskedCode: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function fetchCode(): Promise<string | null> {
    if (code) return code;
    const res = await api<{ codeForCard: string }>(`/api/admin/respondents/${id}/reveal-code`, {
      method: "POST",
    });
    if (!res.ok) {
      setStatus(res.error.message);
      return null;
    }
    setCode(res.data.codeForCard);
    return res.data.codeForCard;
  }

  async function copy() {
    const c = await fetchCode();
    if (!c) return;
    try {
      await navigator.clipboard.writeText(c);
      setStatus("Tersalin");
    } catch {
      setStatus("Gagal menyalin; salin manual.");
    }
  }

  return (
    <span className="row">
      <span className="mono" aria-live="polite">
        {code ?? maskedCode}
      </span>
      {!code && (
        <button
          type="button"
          className="btn btn-sm"
          onClick={fetchCode}
          aria-label="Tampilkan kode akses"
        >
          Tampilkan
        </button>
      )}
      <button type="button" className="btn btn-sm" onClick={copy} aria-label="Salin kode akses">
        Salin
      </button>
      {status && (
        <span className="small muted" role="status">
          {status}
        </span>
      )}
    </span>
  );
}
