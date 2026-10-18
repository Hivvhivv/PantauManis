"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";

/**
 * Menu "⋯" per catatan di Riwayat: Ubah catatan / Hapus catatan.
 * Hapus memakai endpoint yang sama dengan form Ubah; server tetap memeriksa batas
 * pengisian susulan dan kepemilikan catatan (BR-05, BR-09).
 */
export function LogMenu({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const ref = useRef<HTMLDetailsElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tutup saat klik di luar menu atau menekan Escape.
  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !el.contains(e.target as Node)) {
        el.open = false;
      }
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  async function remove() {
    if (!confirm(`Hapus catatan ${label}?`)) return;
    setBusy(true);
    setError(null);
    const res = await api(`/api/respondent/logs/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    if (ref.current) ref.current.open = false;
    router.refresh();
  }

  return (
    <details className="log-menu" ref={ref}>
      <summary className="kebab" aria-label={`Pilihan untuk catatan ${label}`} title="Pilihan">
        ⋯
      </summary>
      <div className="log-menu-panel" role="menu">
        <Link href={`/catat/${id}`} role="menuitem">
          ✏️ Ubah catatan
        </Link>
        <button type="button" role="menuitem" className="danger" onClick={remove} disabled={busy}>
          🗑️ {busy ? "Menghapus…" : "Hapus catatan"}
        </button>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
