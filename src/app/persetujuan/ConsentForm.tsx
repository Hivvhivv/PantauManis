"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";

export function ConsentForm() {
  const hydrated = useHydrated();
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api<{ redirectTo: string }>("/api/respondent/consent", { body: { agree } });
    if (res.ok) return window.location.assign(res.data.redirectTo);
    setError(res.error.message);
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} method="post" className="card stack">
      <label className="option" htmlFor="agree">
        <input
          id="agree"
          type="checkbox"
          checked={agree}
          disabled={!hydrated}
          onChange={(e) => setAgree(e.target.checked)}
        />
        Saya sudah membaca informasi di atas dan bersedia ikut serta dalam penelitian ini.
      </label>
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="btn btn-primary btn-block"
        type="submit"
        disabled={!hydrated || busy || !agree}
      >
        Setuju dan lanjutkan
      </button>
    </form>
  );
}
