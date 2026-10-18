import type { Metadata } from "next";
import Link from "next/link";
import { DayStatusBadge } from "@/components/DayStatusBadge";
import { Disclaimer } from "@/components/Disclaimer";
import { DrinksIllustration } from "@/components/DrinksIllustration";
import { Icon } from "@/components/Icon";
import { RespondentShell } from "@/components/RespondentShell";
import { ZeroDayButton } from "@/components/ZeroDayButton";
import { LogMenu } from "./LogMenu";
import { categoryColor } from "@/lib/palette";
import { respondentAtStage } from "@/server/auth/page-guards";
import { listBeverageTypes } from "@/server/modules/beverages/service";
import { getHistory } from "@/server/modules/consumption/dashboard";
import { historyQuerySchema } from "@/server/modules/consumption/schemas";
import { SUGAR_LEVEL_LABELS } from "@/server/modules/study/estimate";

export const metadata: Metadata = { title: "Riwayat" };

const RANGES = [
  { key: "all", label: "Semua" },
  { key: "7d", label: "7 hari" },
  { key: "2w", label: "2 minggu" },
  { key: "1m", label: "1 bulan" },
  { key: "3m", label: "3 bulan" },
  { key: "1y", label: "1 tahun" },
] as const;

const longDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${d}T00:00:00Z`));

/** Hari yang langsung terbuka; sisanya bisa dibuka satu per satu. */
const OPEN_DAYS = 5;

/** Riwayat per hari (FR-R-04), filter rentang, tanggal, dan jenis minuman. */
export default async function RiwayatPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const r = await respondentAtStage("ready");
  const raw = Object.fromEntries(
    Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const query = historyQuerySchema.parse(raw);
  const [h, types] = await Promise.all([getHistory(r, query), listBeverageTypes()]);
  const nameColor = new Map(types.map((t, i) => [t.name, categoryColor(i)]));

  const link = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams(
      Object.entries({ beverageTypeId: query.beverageTypeId, sort: query.sort, ...params }).filter(
        (e): e is [string, string] => !!e[1],
      ),
    );
    return `/riwayat?${sp.toString()}`;
  };

  return (
    <RespondentShell wide label={r.label}>
      <section className="dash-hero page-hero">
        <div className="stack">
          <p className="eyebrow">Riwayat minuman</p>
          <h1 className="row" style={{ gap: "0.6rem" }}>
            Lihat riwayat minumanmu{" "}
            <span className="h1-icon">
              <Icon name="clock" size={30} />
            </span>
          </h1>
          <p className="lead-text muted" style={{ margin: 0 }}>
            Lihat kembali catatanmu dari waktu ke waktu. Lupa mencatat? Kamu bisa mengisi susulan
            sampai 2 hari ke belakang.
          </p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <DrinksIllustration />
          <p className="hero-quote">
            Kebiasaan kecil,
            <br />
            dicatat sedikit demi sedikit ♡
          </p>
        </div>
      </section>

      {/* Filter */}
      <section className="card stack" aria-labelledby="filter-h">
        <div className="filter-head">
          <h2
            id="filter-h"
            className="row"
            style={{ margin: 0, fontSize: "1.1rem", gap: "0.4rem" }}
          >
            <Icon name="filter" /> Filter riwayat
          </h2>
          <nav className="chips" aria-label="Rentang waktu">
            {RANGES.map((x) => {
              const active = !query.from && !query.to && query.range === x.key;
              return (
                <Link
                  key={x.key}
                  href={link({ range: x.key })}
                  className={`chip${active ? " chip-on" : ""}`}
                  aria-current={active ? "true" : undefined}
                >
                  {x.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <form method="get" className="filters history-filters">
          <div>
            <label htmlFor="from">Dari tanggal</label>
            <input id="from" name="from" type="date" defaultValue={h.from} max={h.to} />
          </div>
          <div>
            <label htmlFor="to">Sampai</label>
            <input id="to" name="to" type="date" defaultValue={h.to} />
          </div>
          <div>
            <label htmlFor="beverageTypeId">Jenis minuman</label>
            <select
              id="beverageTypeId"
              name="beverageTypeId"
              defaultValue={query.beverageTypeId ?? ""}
            >
              <option value="">Semua jenis</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sort">Urutkan</label>
            <select id="sort" name="sort" defaultValue={query.sort}>
              <option value="desc">Terbaru dulu</option>
              <option value="asc">Terlama dulu</option>
            </select>
          </div>
          <button className="btn" type="submit">
            Terapkan
          </button>
        </form>
      </section>

      {/* Daftar */}
      <section className="card stack" aria-labelledby="list-h">
        <div className="row spread">
          <h2 id="list-h" style={{ margin: 0 }}>
            Daftar riwayat minuman
          </h2>
          <span className="small muted">
            {h.summary.totalDrinks} porsi · perkiraan gula ±{h.summary.totalSugar} g ·{" "}
            {h.summary.recordedDays} hari tercatat
          </span>
        </div>

        {h.days.length === 0 && <p className="muted">Belum ada hari yang bisa ditampilkan.</p>}

        <div className="day-groups">
          {h.days.map((d, i) => (
            <details key={d.date} className="day-group" open={i < OPEN_DAYS}>
              <summary>
                <Icon name="calendar" />
                <span className="day-title">
                  <strong>{longDate(d.date)}</strong>
                  <span className="small muted"> · Hari ke-{d.studyDay}</span>
                </span>
                <span className="day-meta small">
                  {d.state === "filled" ? (
                    <>
                      Total gula: <strong>±{d.sugarG} g</strong> <span className="sep">|</span>{" "}
                      {d.drinks} minuman
                    </>
                  ) : (
                    <DayStatusBadge state={d.state} />
                  )}
                </span>
                <span className="chev" aria-hidden="true">
                  <Icon name="chevron" size={18} />
                </span>
              </summary>

              <div className="day-body">
                {d.logs.map((l) => (
                  <div key={l.id} className="hist-item">
                    <span
                      className="recent-icon"
                      style={{ background: nameColor.get(l.beverage) ?? categoryColor(i) }}
                      aria-hidden="true"
                    >
                      {l.icon}
                    </span>
                    <span>
                      <strong>{l.beverage}</strong>
                      <br />
                      <span className="small muted">
                        {l.servings} porsi · {l.volumeMl} ml
                        {l.sugarLevel && ` · ${SUGAR_LEVEL_LABELS[l.sugarLevel]}`}
                      </span>
                      {l.note && (
                        <>
                          <br />
                          <span className="small">“{l.note}”</span>
                        </>
                      )}
                      {(l.isBackfill || l.isOutOfPeriod) && (
                        <>
                          <br />
                          {l.isBackfill && <span className="pill">susulan</span>}{" "}
                          {l.isOutOfPeriod && <span className="pill">di luar periode</span>}
                        </>
                      )}
                    </span>
                    <span className="recent-meta">
                      <strong>±{l.sugarG} g</strong>
                      <br />
                      <span className="small muted">{l.time}</span>
                    </span>
                    {d.editable ? (
                      <LogMenu id={l.id} label={`${l.beverage} pukul ${l.time}`} />
                    ) : (
                      <span />
                    )}
                  </div>
                ))}

                {d.state === "empty" && (
                  <div className="day-note">
                    <p className="small muted" style={{ margin: 0 }}>
                      Belum ada catatan di hari ini.
                    </p>
                    {d.editable && !query.beverageTypeId && (
                      <ZeroDayButton date={d.date} label="Tidak minum minuman manis di hari ini" />
                    )}
                  </div>
                )}
                {d.state === "zero" && (
                  <div className="day-note">
                    <p className="small" style={{ margin: 0 }}>
                      Kamu menandai hari ini tanpa minuman manis. 🙌
                    </p>
                    {d.editable && <ZeroDayButton date={d.date} undo />}
                  </div>
                )}
                {d.state === "filled" && d.logs.length === 0 && (
                  <p className="small muted day-note" style={{ margin: 0 }}>
                    Tidak ada catatan untuk jenis minuman yang dipilih.
                  </p>
                )}
              </div>
            </details>
          ))}
        </div>
      </section>

      <Disclaimer />
    </RespondentShell>
  );
}
