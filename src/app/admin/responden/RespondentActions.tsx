"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

type Props = {
  id: string;
  label: string;
  accessStatus: "active" | "inactive";
  canDelete: boolean;
  /** Tampilkan tautan Detail dan Edit (di list). */
  showLinks?: boolean;
};

/** Menu tindakan responden (FR-A-02). Peran diperiksa ulang di server untuk setiap tindakan. */
export function RespondentActions({ id, label, accessStatus, canDelete, showLinks = true }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "info" | "error"; text: string } | null>(null);

  async function run(fn: () => ReturnType<typeof api>, onOk: (data: unknown) => void) {
    setBusy(true);
    setMessage(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) return setMessage({ kind: "error", text: res.error.message });
    onOk(res.data);
    router.refresh();
  }

  const resetCode = () => {
    if (
      !confirm(
        `Reset kode akses ${label}? Kode lama langsung tidak berlaku. Data responden tetap utuh.`,
      )
    )
      return;
    run(
      () => api(`/api/admin/respondents/${id}/reset-code`, { method: "POST" }),
      (d) =>
        setMessage({
          kind: "info",
          text: `Kode baru ${label}: ${(d as { codeForCard: string }).codeForCard}`,
        }),
    );
  };

  const toggle = () => {
    const next = accessStatus === "active" ? "inactive" : "active";
    const verb = next === "inactive" ? "Nonaktifkan" : "Aktifkan";
    if (!confirm(`${verb} akses ${label}?`)) return;
    run(
      () => api(`/api/admin/respondents/${id}/status`, { body: { status: next } }),
      () =>
        setMessage({
          kind: "info",
          text: `Akses ${label} ${next === "active" ? "diaktifkan" : "dinonaktifkan"}.`,
        }),
    );
  };

  const remove = () => {
    if (!confirm(`Hapus ${label}? Data dikeluarkan dari daftar dan analisis (hapus lunak).`))
      return;
    run(
      () => api(`/api/admin/respondents/${id}`, { method: "DELETE" }),
      () =>
        showLinks
          ? setMessage({ kind: "info", text: `${label} dihapus.` })
          : router.push("/admin/responden"),
    );
  };

  return (
    <div className="stack" style={{ minWidth: 220 }}>
      <div className="row">
        {showLinks && (
          <>
            <Link className="btn btn-sm" href={`/admin/responden/${id}`}>
              Detail
            </Link>
            <Link className="btn btn-sm" href={`/admin/responden/${id}/ubah`}>
              Edit
            </Link>
          </>
        )}
        <button type="button" className="btn btn-sm" onClick={resetCode} disabled={busy}>
          Reset Kode
        </button>
        <button type="button" className="btn btn-sm" onClick={toggle} disabled={busy}>
          {accessStatus === "active" ? "Nonaktifkan" : "Aktifkan"}
        </button>
        <Link className="btn btn-sm" href={`/admin/responden/cetak?id=${id}`}>
          Cetak Kartu
        </Link>
        {canDelete && (
          <button type="button" className="btn btn-sm btn-danger" onClick={remove} disabled={busy}>
            Hapus
          </button>
        )}
      </div>
      {message && (
        <p
          className={`small alert ${message.kind === "error" ? "alert-error" : "alert-info"}`}
          role="status"
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
