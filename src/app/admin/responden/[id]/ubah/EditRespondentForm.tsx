"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type ApiError } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";
import {
  RespondentFields,
  respondentFormValues,
  type RespondentDefaults,
} from "@/components/RespondentFields";

export function EditRespondentForm({ id, defaults }: { id: string; defaults: RespondentDefaults }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api(`/api/admin/respondents/${id}`, {
      method: "PATCH",
      body: respondentFormValues(new FormData(e.currentTarget)),
    });
    if (res.ok) {
      router.push(`/admin/responden/${id}`);
      router.refresh();
      return;
    }
    setBusy(false);
    setError(res.error);
  }

  return (
    <form onSubmit={onSubmit} method="post" className="card stack" style={{ maxWidth: 560 }}>
      <RespondentFields error={error} defaults={defaults} labelRequired />
      {error && (
        <p className="alert alert-error" role="alert">
          {error.message}
        </p>
      )}
      <button className="btn btn-primary" type="submit" disabled={!hydrated || busy}>
        Simpan perubahan
      </button>
    </form>
  );
}
