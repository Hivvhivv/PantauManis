"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type ApiError } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";
import { FieldError } from "@/components/FieldError";
import {
  estimateSugarG,
  SUGAR_LEVEL_LABELS,
  type SugarLevel,
} from "@/server/modules/study/estimate";

export type BeverageOption = {
  id: string;
  name: string;
  icon: string;
  defaultVolumeMl: number;
  sugarGPerServing: number;
  sugarLevelApplicable: boolean;
};

export type LogFormInitial = {
  id?: string;
  beverageTypeId: string;
  volumeMl: number | "";
  servings: number;
  sugarLevel: SugarLevel | null;
  consumedAt: string;
  note: string;
};

type Props = {
  beverages: BeverageOption[];
  sizes: readonly { label: string; ml: number }[];
  factors: { less: number; none: number };
  minDateTime: string;
  maxDateTime: string;
  backfillDays: number;
  initial: LogFormInitial;
};

/** Form pencatatan minuman (FR-R-02). Perkiraan gula dihitung ulang di server saat disimpan. */
export function LogForm({
  beverages,
  sizes,
  factors,
  minDateTime,
  maxDateTime,
  backfillDays,
  initial,
}: Props) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const bev = beverages.find((b) => b.id === v.beverageTypeId);

  const estimate = useMemo(() => {
    if (!bev || !v.volumeMl || v.volumeMl < 1) return null;
    return estimateSugarG({
      sugarGPerServing: bev.sugarGPerServing,
      defaultVolumeMl: bev.defaultVolumeMl,
      volumeMl: Number(v.volumeMl),
      servings: v.servings,
      sugarLevel: v.sugarLevel,
      sugarLevelApplicable: bev.sugarLevelApplicable,
      factors,
    });
  }, [bev, v.volumeMl, v.servings, v.sugarLevel, factors]);

  const pickBeverage = (b: BeverageOption) =>
    setV((s) => ({
      ...s,
      beverageTypeId: b.id,
      volumeMl: s.volumeMl || b.defaultVolumeMl,
      sugarLevel: b.sugarLevelApplicable ? (s.sugarLevel ?? "normal") : null,
    }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = { ...v, id: undefined };
    const res = v.id
      ? await api(`/api/respondent/logs/${v.id}`, { method: "PATCH", body })
      : await api("/api/respondent/logs", { body });
    if (res.ok) {
      router.push(v.id ? "/riwayat" : "/beranda?tersimpan=1");
      router.refresh();
      return;
    }
    setError(res.error);
    setBusy(false);
  }

  async function onDelete() {
    if (!v.id || !confirm("Hapus catatan ini?")) return;
    setBusy(true);
    const res = await api(`/api/respondent/logs/${v.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/riwayat");
      router.refresh();
      return;
    }
    setError(res.error);
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} method="post" className="card" noValidate>
      {/* Isian nonaktif sampai hidrasi selesai, agar pilihan sebelum itu tidak hilang. */}
      <fieldset disabled={!hydrated} className="stack">
        <fieldset>
          <legend>Jenis minuman</legend>
          <div className="tiles">
            {beverages.map((b) => (
              <div className="tile" key={b.id}>
                <input
                  type="radio"
                  id={`bev-${b.id}`}
                  name="beverageTypeId"
                  value={b.id}
                  checked={v.beverageTypeId === b.id}
                  onChange={() => pickBeverage(b)}
                />
                <label htmlFor={`bev-${b.id}`}>
                  <span className="emoji" aria-hidden="true">
                    {b.icon}
                  </span>
                  {b.name}
                </label>
              </div>
            ))}
          </div>
          <FieldError error={error} name="beverageTypeId" />
        </fieldset>

        <div>
          <label htmlFor="volumeMl">Ukuran (ml)</label>
          <div className="chips" style={{ marginBottom: "0.5rem" }}>
            {sizes.map((s) => (
              <button
                key={s.label}
                type="button"
                className="chip"
                aria-pressed={v.volumeMl === s.ml}
                onClick={() => setV((x) => ({ ...x, volumeMl: s.ml }))}
              >
                {s.label} · {s.ml} ml
              </button>
            ))}
          </div>
          <input
            id="volumeMl"
            type="number"
            inputMode="numeric"
            min={1}
            max={3000}
            value={v.volumeMl}
            onChange={(e) =>
              setV((x) => ({ ...x, volumeMl: e.target.value === "" ? "" : Number(e.target.value) }))
            }
            aria-invalid={error?.fields.volumeMl ? true : undefined}
          />
          <FieldError error={error} name="volumeMl" />
        </div>

        <div>
          <label htmlFor="servings">Jumlah porsi</label>
          <div className="stepper">
            <button
              type="button"
              aria-label="Kurangi porsi"
              onClick={() => setV((x) => ({ ...x, servings: Math.max(1, x.servings - 1) }))}
            >
              −
            </button>
            <input
              id="servings"
              type="number"
              inputMode="numeric"
              min={1}
              max={10}
              value={v.servings}
              onChange={(e) =>
                setV((x) => ({
                  ...x,
                  servings: Math.min(10, Math.max(1, Number(e.target.value) || 1)),
                }))
              }
            />
            <button
              type="button"
              aria-label="Tambah porsi"
              onClick={() => setV((x) => ({ ...x, servings: Math.min(10, x.servings + 1) }))}
            >
              +
            </button>
          </div>
          <FieldError error={error} name="servings" />
        </div>

        {bev?.sugarLevelApplicable && (
          <fieldset>
            <legend>Tingkat gula</legend>
            <div className="segmented">
              {(Object.keys(SUGAR_LEVEL_LABELS) as SugarLevel[]).map((lvl) => (
                <span key={lvl}>
                  <input
                    type="radio"
                    id={`lvl-${lvl}`}
                    name="sugarLevel"
                    checked={v.sugarLevel === lvl}
                    onChange={() => setV((x) => ({ ...x, sugarLevel: lvl }))}
                  />
                  <label htmlFor={`lvl-${lvl}`}>{SUGAR_LEVEL_LABELS[lvl]}</label>
                </span>
              ))}
            </div>
          </fieldset>
        )}

        <div>
          <label htmlFor="consumedAt">
            Waktu minum{" "}
            <span className="hint">hari ini atau sampai {backfillDays} hari sebelumnya</span>
          </label>
          <input
            id="consumedAt"
            type="datetime-local"
            min={minDateTime}
            max={maxDateTime}
            value={v.consumedAt}
            onChange={(e) => setV((x) => ({ ...x, consumedAt: e.target.value }))}
            aria-invalid={error?.fields.consumedAt ? true : undefined}
          />
          <FieldError error={error} name="consumedAt" />
        </div>

        <div>
          <label htmlFor="note">
            Catatan <span className="hint">opsional</span>
          </label>
          <textarea
            id="note"
            maxLength={500}
            value={v.note}
            onChange={(e) => setV((x) => ({ ...x, note: e.target.value }))}
            placeholder="mis. diminum bersama teman"
          />
        </div>

        <p className="estimate" aria-live="polite" style={{ margin: 0 }}>
          Perkiraan gula: {estimate === null ? "—" : `±${estimate} g`}
          <span className="hint" style={{ display: "block", fontWeight: 400 }}>
            Angka ini perkiraan dari tabel referensi, bukan hasil pengukuran.
          </span>
        </p>

        {error && Object.keys(error.fields).length === 0 && (
          <p className="alert alert-error" role="alert">
            {error.message}
          </p>
        )}

        <div className="grid-2">
          <Link className="btn" href={v.id ? "/riwayat" : "/beranda"}>
            Batal
          </Link>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={!hydrated || busy || !v.beverageTypeId}
          >
            Simpan
          </button>
        </div>
        {v.id && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={onDelete}
            disabled={!hydrated || busy}
          >
            Hapus catatan
          </button>
        )}
      </fieldset>
    </form>
  );
}
