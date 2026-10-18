"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type ApiError } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";
import { FieldError } from "@/components/FieldError";

type Settings = {
  durationDays: number;
  posttestGraceDays: number;
  backfillDays: number;
  sugarFactorLess: number;
  sugarFactorNone: number;
  consentText: string;
  contactText: string;
};

export function SettingsForm({ initial }: { initial: Settings }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [error, setError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = Object.fromEntries(f.entries());
    if (
      Number(body.durationDays) !== initial.durationDays &&
      !confirm(
        "Mengubah durasi periode memengaruhi hari ke-, kelengkapan, dan jendela posttest semua responden. Lanjutkan?",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await api<{ changed: string[] }>("/api/superadmin/settings", {
      method: "PUT",
      body,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setNotice(res.data.changed.length ? "Pengaturan disimpan." : "Tidak ada perubahan.");
    router.refresh();
  }

  const num = (
    name: keyof Settings,
    label: string,
    hint: string,
    attrs: { min: number; max: number; step?: string },
  ) => (
    <div>
      <label htmlFor={name}>
        {label} <span className="hint">{hint}</span>
      </label>
      <input
        id={name}
        name={name}
        type="number"
        defaultValue={initial[name] as number}
        {...attrs}
        required
        aria-invalid={error?.fields[name] ? true : undefined}
      />
      <FieldError error={error} name={name} />
    </div>
  );

  return (
    <form onSubmit={onSubmit} method="post" className="card" style={{ maxWidth: 820 }}>
      <fieldset disabled={!hydrated} className="stack">
        <h2 style={{ margin: 0 }}>Periode</h2>
        <div className="grid-2">
          {num("durationDays", "Durasi periode (hari)", "default 14", { min: 7, max: 60 })}
          {num("posttestGraceDays", "Masa tenggang posttest (hari)", "default 3", {
            min: 0,
            max: 14,
          })}
          {num("backfillDays", "Batas pengisian susulan (hari)", "default 2", { min: 0, max: 7 })}
        </div>

        <h2 style={{ margin: "0.5rem 0 0" }}>Faktor tingkat gula</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Pengali perkiraan gula untuk pilihan tingkat gula (normal = 1). Hanya berlaku untuk
          catatan baru.
        </p>
        <div className="grid-2">
          {num("sugarFactorLess", "Less sugar", "0–1, default 0,5", {
            min: 0,
            max: 1,
            step: "0.05",
          })}
          {num("sugarFactorNone", "No sugar", "0–1, default 0", { min: 0, max: 1, step: "0.05" })}
        </div>

        <h2 style={{ margin: "0.5rem 0 0" }}>Lembar informasi & persetujuan</h2>
        <div>
          <label htmlFor="consentText">
            Teks yang dibaca responden sebelum menyetujui{" "}
            <span className="hint">gunakan versi yang disetujui komite etik</span>
          </label>
          <textarea
            id="consentText"
            name="consentText"
            defaultValue={initial.consentText}
            rows={12}
            maxLength={20000}
            required
          />
          <FieldError error={error} name="consentText" />
        </div>

        <h2 style={{ margin: "0.5rem 0 0" }}>Kontak bantuan untuk responden</h2>
        <div>
          <label htmlFor="contactText">
            Tampil di halaman masuk sebagai &ldquo;Lupa kode akses? Hubungi tim peneliti: …&rdquo;{" "}
            <span className="hint">opsional, maks. 300 karakter; kosongkan untuk teks umum</span>
          </label>
          <input
            id="contactText"
            name="contactText"
            defaultValue={initial.contactText}
            maxLength={300}
            placeholder="mis. WhatsApp Tim Peneliti 0812-0000-0000 (Inof)"
            aria-invalid={error?.fields.contactText ? true : undefined}
          />
          <FieldError error={error} name="contactText" />
        </div>

        {error && Object.keys(error.fields).length === 0 && (
          <p className="alert alert-error" role="alert">
            {error.message}
          </p>
        )}
        {notice && (
          <p className="alert alert-info" role="status">
            {notice}
          </p>
        )}
        <button className="btn btn-primary" type="submit" disabled={!hydrated || busy}>
          Simpan pengaturan
        </button>
      </fieldset>
    </form>
  );
}
