"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type ApiError } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";
import { FieldError } from "@/components/FieldError";
import { Icon } from "@/components/Icon";
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
  /** "YYYY-MM-DDTHH:mm" waktu Jakarta. */
  consumedAt: string;
  note: string;
};

type Props = {
  beverages: BeverageOption[];
  sizes: readonly { label: string; ml: number }[];
  factors: { less: number; none: number };
  backfillDays: number;
  dates: { value: string; label: string }[];
  favorites: { beverageTypeId: string; volumeMl: number | null; count: number }[];
  nowLocal: string;
  initial: LogFormInitial;
};

const NOTE_MAX = 500;
/** 1 sendok teh gula pasir ≈ 4 gram (untuk gambaran saja). */
const GRAMS_PER_TSP = 4;

/** Form pencatatan minuman (FR-R-02). Perkiraan gula dihitung ulang di server saat disimpan. */
export function LogForm({
  beverages,
  sizes,
  factors,
  backfillDays,
  dates,
  favorites,
  nowLocal,
  initial,
}: Props) {
  const hydrated = useHydrated();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [v, setV] = useState(initial);
  const [date, setDate] = useState(initial.consumedAt.slice(0, 10));
  const [time, setTime] = useState(initial.consumedAt.slice(11, 16));
  const [query, setQuery] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const bev = beverages.find((b) => b.id === v.beverageTypeId);
  const isToday = date === nowLocal.slice(0, 10);

  const visible = beverages.filter((b) =>
    b.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const favs = favorites
    .map((f) => ({ ...f, bev: beverages.find((b) => b.id === f.beverageTypeId) }))
    .filter((f): f is typeof f & { bev: BeverageOption } => !!f.bev);

  const estimate = useMemo(() => {
    if (!bev || !v.volumeMl || v.volumeMl < 1) return null;
    const one = estimateSugarG({
      sugarGPerServing: bev.sugarGPerServing,
      defaultVolumeMl: bev.defaultVolumeMl,
      volumeMl: Number(v.volumeMl),
      servings: 1,
      sugarLevel: v.sugarLevel,
      sugarLevelApplicable: bev.sugarLevelApplicable,
      factors,
    });
    const total = Math.round(one * v.servings * 10) / 10;
    return { one, total, tsp: Math.round((total / GRAMS_PER_TSP) * 2) / 2 };
  }, [bev, v.volumeMl, v.servings, v.sugarLevel, factors]);

  const pickBeverage = (b: BeverageOption, volumeMl?: number | null) =>
    setV((s) => ({
      ...s,
      beverageTypeId: b.id,
      volumeMl: volumeMl ?? (s.volumeMl || b.defaultVolumeMl),
      sugarLevel: b.sugarLevelApplicable ? (s.sugarLevel ?? "normal") : null,
    }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = { ...v, id: undefined, consumedAt: `${date}T${time}` };
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
    <form onSubmit={onSubmit} method="post" noValidate>
      {/* Isian nonaktif sampai hidrasi selesai, agar pilihan sebelum itu tidak hilang. */}
      <fieldset disabled={!hydrated} className="log-layout">
        {/* Kolom kiri: pilih jenis + estimasi */}
        <div className="log-col">
          <section className="card stack log-step1" aria-labelledby="step1-h">
            <div className="step-head">
              <span className="step-badge" aria-hidden="true">
                1
              </span>
              <div>
                <h2 id="step1-h">Pilih jenis minuman</h2>
                <p className="small muted">
                  Mulai dengan memilih kategori minuman yang kamu minum.
                </p>
              </div>
            </div>

            <div className="search">
              <label htmlFor="bev-search" className="sr-only">
                Cari minuman
              </label>
              <Icon name="search" size={18} />
              <input
                id="bev-search"
                ref={searchRef}
                type="search"
                placeholder="Cari minuman…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <fieldset>
              <legend className="sr-only">Jenis minuman</legend>
              <div className="tiles big">
                {visible.map((b) => (
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
              {visible.length === 0 && (
                <p className="small muted">
                  Tidak ditemukan. Pilih <strong>Lainnya</strong> dan tulis nama minumannya di
                  catatan.
                </p>
              )}
              <FieldError error={error} name="beverageTypeId" />
            </fieldset>

            {!v.id && favs.length > 0 && (
              <div className="stack" style={{ marginTop: "1.25rem" }}>
                <h3 className="fav-title">
                  <span aria-hidden="true">⭐</span> Minuman favoritmu
                </h3>
                <div className="fav-grid">
                  {favs.map((f) => (
                    <button
                      key={f.beverageTypeId}
                      type="button"
                      className="fav"
                      aria-pressed={v.beverageTypeId === f.beverageTypeId}
                      onClick={() => pickBeverage(f.bev, f.volumeMl)}
                    >
                      <span className="emoji" aria-hidden="true">
                        {f.bev.icon}
                      </span>
                      <span>{f.bev.name}</span>
                      <span className="small muted">{f.volumeMl ? `${f.volumeMl} ml` : ""}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="card stack log-est" aria-labelledby="est-h">
            <h2 id="est-h" style={{ margin: 0 }}>
              Perkiraan kandungan gula
            </h2>
            <div className="estimate-card" aria-live="polite">
              <span className="stat-icon big" aria-hidden="true">
                <Icon name="sugar" size={26} />
              </span>
              <div>
                <div className="est-big">
                  {estimate ? `±${estimate.one}` : "—"} <small>g</small>
                </div>
                <div className="small muted">per porsi</div>
              </div>
              <div className="est-total">
                <div className="small muted">Total ({v.servings} porsi)</div>
                <div id="estimate-total" className="est-mid">
                  {estimate ? `±${estimate.total} g` : "—"}
                </div>
                {estimate && <div className="small muted">≈ {estimate.tsp} sdt gula</div>}
              </div>
            </div>
            <p className="hint" style={{ margin: 0 }}>
              Angka ini perkiraan dari tabel referensi, bukan hasil pengukuran.
            </p>
            <div className="tip-card">
              <span className="icon" aria-hidden="true">
                💡
              </span>
              <div>
                <strong>Tips</strong>
                <ul className="small" style={{ margin: "0.25rem 0 0", paddingLeft: "1.1rem" }}>
                  <li>Pilih ukuran yang paling mendekati gelas atau botolmu.</li>
                  <li>Kadar gula bisa berbeda antar merek dan varian.</li>
                  <li>Lupa mencatat? Kamu bisa mengisi sampai {backfillDays} hari ke belakang.</li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* Kolom kanan: detail */}
        <div className="log-col">
          <section className="card stack log-step2" aria-labelledby="step2-h">
            <div className="step-head">
              <span className="step-badge" aria-hidden="true">
                2
              </span>
              <div>
                <h2 id="step2-h">Isi detail minuman</h2>
                <p className="small muted">Masukkan informasi sesuai minuman yang kamu minum.</p>
              </div>
            </div>

            <div className="selected-bev">
              <span className="sel-icon" aria-hidden="true">
                {bev?.icon ?? "🥤"}
              </span>
              <div>
                <strong>{bev?.name ?? "Belum memilih minuman"}</strong>
                <div className="small muted">
                  {bev ? "Jenis minuman" : "Pilih jenis minuman di langkah 1"}
                </div>
              </div>
              {bev && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => searchRef.current?.focus()}
                >
                  Ubah
                </button>
              )}
            </div>

            <fieldset>
              <legend>Ukuran</legend>
              <div className="size-grid">
                {sizes.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    className="size"
                    aria-pressed={v.volumeMl === s.ml}
                    onClick={() => setV((x) => ({ ...x, volumeMl: s.ml }))}
                  >
                    <strong>{s.ml} ml</strong>
                    <span className="small">{s.label}</span>
                  </button>
                ))}
              </div>
              <label htmlFor="volumeMl" className="small" style={{ marginTop: "0.6rem" }}>
                Atau isi sendiri (ml)
              </label>
              <input
                id="volumeMl"
                type="number"
                inputMode="numeric"
                min={1}
                max={3000}
                value={v.volumeMl}
                onChange={(e) =>
                  setV((x) => ({
                    ...x,
                    volumeMl: e.target.value === "" ? "" : Number(e.target.value),
                  }))
                }
                aria-invalid={error?.fields.volumeMl ? true : undefined}
              />
              <FieldError error={error} name="volumeMl" />
            </fieldset>

            <div>
              <label htmlFor="servings">Jumlah porsi</label>
              <div className="row" style={{ flexWrap: "nowrap" }}>
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
                <span className="muted">porsi</span>
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

            <fieldset>
              <legend>Waktu minum</legend>
              <div className="grid-2" style={{ gap: "0.6rem" }}>
                <div>
                  <label htmlFor="consumedDate" className="sr-only">
                    Tanggal minum
                  </label>
                  <select id="consumedDate" value={date} onChange={(e) => setDate(e.target.value)}>
                    {/* Tanggal catatan lama tetap bisa dipilih saat mengubah. */}
                    {!dates.some((d) => d.value === date) && <option value={date}>{date}</option>}
                    {dates.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="consumedTime" className="sr-only">
                    Jam minum
                  </label>
                  <input
                    id="consumedTime"
                    type="time"
                    value={time}
                    max={isToday ? nowLocal.slice(11, 16) : undefined}
                    onChange={(e) => setTime(e.target.value)}
                    aria-invalid={error?.fields.consumedAt ? true : undefined}
                  />
                </div>
              </div>
              <FieldError error={error} name="consumedAt" />
            </fieldset>

            <div>
              <label htmlFor="note">
                Catatan <span className="hint">opsional, mis. nama minuman atau merek</span>
              </label>
              <textarea
                id="note"
                maxLength={NOTE_MAX}
                value={v.note}
                onChange={(e) => setV((x) => ({ ...x, note: e.target.value }))}
                placeholder="Contoh: es kopi susu gula aren, kurang manis"
              />
              <div className="small muted" style={{ textAlign: "right" }}>
                {v.note.length}/{NOTE_MAX}
              </div>
            </div>

            {error && Object.keys(error.fields).length === 0 && (
              <p className="alert alert-error" role="alert">
                {error.message}
              </p>
            )}

            <button
              className="btn btn-primary btn-block btn-lg"
              type="submit"
              disabled={!hydrated || busy || !v.beverageTypeId}
            >
              <Icon name="cup" /> {v.id ? "Simpan perubahan" : "Simpan catatan"}
            </button>
            <div className={v.id ? "grid-2" : undefined}>
              <Link className="btn btn-block" href={v.id ? "/riwayat" : "/beranda"}>
                Batal
              </Link>
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
            </div>
          </section>

          {bev && (
            <section className="ready-card" aria-live="polite">
              <span className="stat-icon" aria-hidden="true">
                <Icon name="check" />
              </span>
              <div>
                <strong>Siap untuk disimpan!</strong>
                <div className="small muted">
                  Setelah disimpan, catatanmu langsung muncul di ringkasan harian dan riwayat.
                </div>
              </div>
            </section>
          )}
        </div>
      </fieldset>
    </form>
  );
}
