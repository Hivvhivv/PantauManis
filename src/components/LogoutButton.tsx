"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";

export function LogoutButton({ kind }: { kind: "staff" | "respondent" }) {
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    const res = await api<{ redirectTo: string }>(`/api/auth/${kind}/logout`, { method: "POST" });
    window.location.assign(
      res.ok ? res.data.redirectTo : kind === "staff" ? "/staf/masuk" : "/masuk",
    );
  }
  return (
    <button type="button" className="btn btn-sm" onClick={logout} disabled={busy}>
      Keluar
    </button>
  );
}
