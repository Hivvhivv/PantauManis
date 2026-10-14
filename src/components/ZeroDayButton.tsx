"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";

/** "Hari ini saya tidak minum minuman manis" (BR-02) atau pembatalannya. */
export function ZeroDayButton({
  date,
  undo = false,
  label,
}: {
  date: string;
  undo?: boolean;
  label?: string;
}) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    const res = await api("/api/respondent/days/zero", {
      method: undo ? "DELETE" : "POST",
      body: { date },
    });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    router.refresh();
  }

  return (
    <div className="stack" style={{ marginTop: 0 }}>
      <button
        type="button"
        className={undo ? "btn btn-sm" : "btn btn-block"}
        onClick={run}
        disabled={!hydrated || busy}
      >
        {label ?? (undo ? "Batalkan status Nol" : "🙌 Hari ini saya tidak minum minuman manis")}
      </button>
      {error && (
        <p className="alert alert-error small" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
