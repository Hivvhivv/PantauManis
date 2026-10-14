"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type ApiError } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";
import { FieldError } from "@/components/FieldError";

export type BeverageDefaults = {
  id?: string;
  name: string;
  icon: string;
  defaultVolumeMl: number | "";
  sugarGPerServing: number | "";
  sugarLevelApplicable: boolean;
  source: string | null;
  needsVerification: boolean;
  isActive: boolean;
  sortOrder: number;
};

export function BeverageTypeForm({ defaults }: { defaults: BeverageDefaults }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const res = await api(
      defaults.id ? `/api/admin/beverage-types/${defaults.id}` : "/api/admin/beverage-types",
      {
        method: defaults.id ? "PATCH" : "POST",
        body: {
          name: f.get("name"),
          icon: f.get("icon"),
          defaultVolumeMl: f.get("defaultVolumeMl"),
          sugarGPerServing: f.get("sugarGPerServing"),
          sugarLevelApplicable: f.get("sugarLevelApplicable") === "on",
          source: f.get("source"),
          needsVerification: f.get("needsVerification") === "on",
          isActive: f.get("isActive") === "on",
          sortOrder: f.get("sortOrder"),
        },
      },
    );
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push("/admin/referensi-minuman");
    router.refresh();
  }

  const check = (name: keyof BeverageDefaults, label: string, hint?: string) => (
    <div className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
      <input
        id={name}
        name={name}
        type="checkbox"
        defaultChecked={Boolean(defaults[name])}
        style={{ width: 22, minHeight: 22, marginTop: 2 }}
      />
      <label htmlFor={name} style={{ margin: 0 }}>
        {label} {hint && <span className="hint">{hint}</span>}
      </label>
    </div>
  );

  return (
    <form onSubmit={onSubmit} method="post" className="card stack" style={{ maxWidth: 600 }}>
      <div className="grid-2">
        <div>
          <label htmlFor="name">Nama jenis minuman</label>
          <input id="name" name="name" defaultValue={defaults.name} maxLength={60} required />
          <FieldError error={error} name="name" />
        </div>
        <div>
          <label htmlFor="icon">
            Ikon <span className="hint">emoji</span>
          </label>
          <input id="icon" name="icon" defaultValue={defaults.icon} maxLength={16} required />
        </div>
        <div>
          <label htmlFor="defaultVolumeMl">Volume sajian standar (ml)</label>
          <input
            id="defaultVolumeMl"
            name="defaultVolumeMl"
            type="number"
            min={1}
            max={3000}
            defaultValue={defaults.defaultVolumeMl}
            required
          />
          <FieldError error={error} name="defaultVolumeMl" />
        </div>
        <div>
          <label htmlFor="sugarGPerServing">Perkiraan gula per sajian (gram)</label>
          <input
            id="sugarGPerServing"
            name="sugarGPerServing"
            type="number"
            min={0}
            max={500}
            step="0.1"
            defaultValue={defaults.sugarGPerServing}
            required
          />
          <FieldError error={error} name="sugarGPerServing" />
        </div>
      </div>
      <div>
        <label htmlFor="source">Sumber nilai gula</label>
        <input id="source" name="source" defaultValue={defaults.source ?? ""} maxLength={300} />
        <FieldError error={error} name="source" />
      </div>
      <div>
        <label htmlFor="sortOrder">Urutan tampil</label>
        <input
          id="sortOrder"
          name="sortOrder"
          type="number"
          min={0}
          max={999}
          defaultValue={defaults.sortOrder}
        />
      </div>
      {check(
        "sugarLevelApplicable",
        "Responden bisa memilih tingkat gula",
        "(normal / less / no sugar)",
      )}
      {check("needsVerification", "Nilai perlu diverifikasi", "(masih contoh)")}
      {check("isActive", "Aktif", "(muncul di form pencatatan)")}
      {error && Object.keys(error.fields).length === 0 && (
        <p className="alert alert-error" role="alert">
          {error.message}
        </p>
      )}
      <button className="btn btn-primary" type="submit" disabled={!hydrated || busy}>
        Simpan
      </button>
    </form>
  );
}
