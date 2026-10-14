"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";

export function StaffLoginForm() {
  const hydrated = useHydrated();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const res = await api<{ redirectTo: string }>("/api/auth/staff/login", {
      body: { email: form.get("email"), password: form.get("password") },
    });
    if (res.ok) {
      window.location.assign(res.data.redirectTo);
      return;
    }
    setError(res.error.message);
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} method="post" className="stack">
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div>
        <label htmlFor="password">Kata sandi</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primary btn-block" type="submit" disabled={!hydrated || busy}>
        {busy ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}
