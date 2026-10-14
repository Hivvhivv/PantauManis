"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";

export function SecurityAlertBanner({
  id,
  createdAt,
  failures,
}: {
  id: string;
  createdAt: string;
  failures: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function ack() {
    setBusy(true);
    await api(`/api/superadmin/security-alerts/${id}/ack`, { method: "POST" });
    router.refresh();
  }

  return (
    <div className="alert alert-warning row spread" role="alert">
      <span>
        <strong>Peringatan keamanan:</strong> terdeteksi {failures} percobaan kode akses gagal dalam
        15 menit ({formatDateTime(createdAt)}). Login kode akses ditunda sementara. Periksa apakah
        ada upaya menebak kode.
      </span>
      <button type="button" className="btn btn-sm" onClick={ack} disabled={busy}>
        Tandai sudah dibaca
      </button>
    </div>
  );
}
