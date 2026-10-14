"use client";

import { useState } from "react";
import { api, type ApiError } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";
import { IssuedCodes, type IssuedCodeView } from "@/components/IssuedCodes";
import { RespondentFields, respondentFormValues } from "@/components/RespondentFields";

export function AddRespondentForm({ nextLabel }: { nextLabel: string }) {
  const hydrated = useHydrated();
  const [error, setError] = useState<ApiError | null>(null);
  const [issued, setIssued] = useState<IssuedCodeView | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api<IssuedCodeView>("/api/admin/respondents", {
      body: respondentFormValues(new FormData(e.currentTarget)),
    });
    setBusy(false);
    if (res.ok) setIssued(res.data);
    else setError(res.error);
  }

  if (issued) return <IssuedCodes title={`Responden ${issued.label} dibuat`} items={[issued]} />;

  return (
    <form onSubmit={onSubmit} method="post" className="card stack" style={{ maxWidth: 560 }}>
      <RespondentFields error={error} labelPlaceholder={nextLabel} />
      <p className="small muted">Kode akses dibuat otomatis secara acak setelah disimpan.</p>
      {error && (
        <p className="alert alert-error" role="alert">
          {error.message}
        </p>
      )}
      <button className="btn btn-primary" type="submit" disabled={!hydrated || busy}>
        Simpan &amp; buat kode
      </button>
    </form>
  );
}
