"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";

export function RespondentLoginForm() {
  const hydrated = useHydrated();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api<{ redirectTo: string }>("/api/auth/respondent/login", { body: { code } });
    if (res.ok) {
      window.location.assign(res.data.redirectTo);
      return;
    }
    setError(res.error.message);
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} method="post" className="stack" noValidate>
      <div>
        <label htmlFor="code">
          Kode Akses <span className="hint">contoh: PM-482-915</span>
        </label>
        <input
          id="code"
          name="code"
          className="code-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={20}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "code-error code-help" : "code-help"}
          required
        />
        <p id="code-help" className="hint" style={{ margin: "0.35rem 0 0" }}>
          Boleh diketik tanpa &quot;PM-&quot;, spasi, atau tanda strip.
        </p>
      </div>
      {error && (
        <p id="code-error" className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="btn btn-primary btn-block"
        type="submit"
        disabled={!hydrated || busy || !code.trim()}
      >
        {busy ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}
