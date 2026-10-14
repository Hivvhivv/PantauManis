"use client";

import { useState } from "react";
import { api, type ApiError } from "@/lib/api-client";
import { FieldError } from "@/components/FieldError";
import { useHydrated } from "@/lib/use-hydrated";

export function ChangePasswordForm() {
  const hydrated = useHydrated();
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get("newPassword") !== form.get("confirmPassword")) {
      setError({
        code: "MISMATCH",
        message: "Periksa kembali isian Anda.",
        fields: { confirmPassword: "Konfirmasi kata sandi tidak sama." },
      });
      return;
    }
    setBusy(true);
    setError(null);
    const res = await api<{ redirectTo: string }>("/api/auth/staff/change-password", {
      body: { currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") },
    });
    if (res.ok) {
      window.location.assign(res.data.redirectTo);
      return;
    }
    setError(res.error);
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} method="post" className="stack">
      <div>
        <label htmlFor="currentPassword">Kata sandi saat ini</label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
        <FieldError error={error} name="currentPassword" />
      </div>
      <div>
        <label htmlFor="newPassword">
          Kata sandi baru <span className="hint">minimal 8 karakter</span>
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <FieldError error={error} name="newPassword" />
      </div>
      <div>
        <label htmlFor="confirmPassword">Ulangi kata sandi baru</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
        <FieldError error={error} name="confirmPassword" />
      </div>
      {error && Object.keys(error.fields).length === 0 && (
        <p className="alert alert-error" role="alert">
          {error.message}
        </p>
      )}
      <button className="btn btn-primary btn-block" type="submit" disabled={!hydrated || busy}>
        Simpan kata sandi
      </button>
    </form>
  );
}
