"use client";

import { useState } from "react";
import { api, type ApiError } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";
import { FieldError } from "@/components/FieldError";
import { IssuedCodes, type IssuedCodeView } from "@/components/IssuedCodes";

export function BulkCreateForm() {
  const hydrated = useHydrated();
  const [error, setError] = useState<ApiError | null>(null);
  const [items, setItems] = useState<IssuedCodeView[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const res = await api<{ items: IssuedCodeView[] }>("/api/admin/respondents/bulk", {
      body: {
        count: form.get("count"),
        prefix: form.get("prefix"),
        startNumber: form.get("startNumber"),
      },
    });
    setBusy(false);
    if (res.ok) setItems(res.data.items);
    else setError(res.error);
  }

  if (items) return <IssuedCodes title={`${items.length} responden dibuat`} items={items} />;

  return (
    <form onSubmit={onSubmit} method="post" className="card stack" style={{ maxWidth: 560 }}>
      <div>
        <label htmlFor="count">Jumlah responden</label>
        <input id="count" name="count" type="number" min={1} max={200} defaultValue={50} required />
        <FieldError error={error} name="count" />
      </div>
      <div>
        <label htmlFor="prefix">
          Awalan ID <span className="hint">huruf saja</span>
        </label>
        <input id="prefix" name="prefix" defaultValue="R" maxLength={5} required />
        <FieldError error={error} name="prefix" />
      </div>
      <div>
        <label htmlFor="startNumber">
          Nomor awal <span className="hint">kosongkan untuk melanjutkan nomor terakhir</span>
        </label>
        <input id="startNumber" name="startNumber" type="number" min={1} />
        <FieldError error={error} name="startNumber" />
      </div>
      {error && (
        <p className="alert alert-error" role="alert">
          {error.message}
        </p>
      )}
      <button className="btn btn-primary" type="submit" disabled={!hydrated || busy}>
        {busy ? "Membuat…" : "Buat kode"}
      </button>
    </form>
  );
}
