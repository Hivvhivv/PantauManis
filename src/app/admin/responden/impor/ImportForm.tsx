"use client";

import { useState } from "react";
import { api, type ApiError } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";
import { IssuedCodes, type IssuedCodeView } from "@/components/IssuedCodes";

export function ImportForm() {
  const hydrated = useHydrated();
  const [error, setError] = useState<ApiError | null>(null);
  const [items, setItems] = useState<IssuedCodeView[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api<{ items: IssuedCodeView[] }>("/api/admin/respondents/import", {
      form: new FormData(e.currentTarget),
    });
    setBusy(false);
    if (res.ok) setItems(res.data.items);
    else setError(res.error);
  }

  if (items) return <IssuedCodes title={`${items.length} responden diimpor`} items={items} />;

  const rowErrors = error ? Object.values(error.fields) : [];

  return (
    <form onSubmit={onSubmit} method="post" className="card stack" style={{ maxWidth: 720 }}>
      <div>
        <label htmlFor="file">Berkas CSV</label>
        <input id="file" name="file" type="file" accept=".csv,text/csv" required />
      </div>
      {error && (
        <div className="alert alert-error" role="alert">
          <p style={{ margin: 0 }}>{error.message}</p>
          {rowErrors.length > 0 && (
            <ul className="small">
              {rowErrors.slice(0, 50).map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <button className="btn btn-primary" type="submit" disabled={!hydrated || busy}>
        {busy ? "Mengimpor…" : "Impor"}
      </button>
    </form>
  );
}
