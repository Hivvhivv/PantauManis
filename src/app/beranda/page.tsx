import type { Metadata } from "next";
import Link from "next/link";
import { CompositionChart, DrinksBarChart, SugarLineChart } from "@/components/DashboardCharts";
import { DayStatusBadge } from "@/components/DayStatusBadge";
import { Disclaimer } from "@/components/Disclaimer";
import { RespondentShell } from "@/components/RespondentShell";
import { ZeroDayButton } from "@/components/ZeroDayButton";
import { formatLocalDate } from "@/lib/format";
import { respondentAtStage } from "@/server/auth/page-guards";
import { getDashboard } from "@/server/modules/consumption/dashboard";
import { RANGES, type RangeKey } from "@/server/modules/study/series";

export const metadata: Metadata = { title: "Beranda" };

const shortDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${d}T00:00:00Z`),
  );

/** Dashboard Responden (FR-R-03). Hanya data milik responden yang login. */
export default async function BerandaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const r = await respondentAtStage("ready");
  const sp = await searchParams;
  const range: RangeKey =
    typeof sp.range === "string" && sp.range in RANGES ? (sp.range as RangeKey) : "2w";
  const d = await getDashboard(r, range);
  const t = d.todayPoint;
  const inPeriod = d.studyDay <= d.durationDays;

  // Untuk grafik: hari tanpa catatan (Belum diisi) = null agar tidak tampil sebagai 0.
  const daily = d.days.filter((x) => x.state !== "before");
  const labels = d.weeks
    ? d.weeks.map((w) => `Mgg ${shortDate(w.label)}`)
    : daily.map((x) => shortDate(x.date));
  const sugar = d.weeks
    ? d.weeks.map((w) => w.sugarG)
    : daily.map((x) => (x.state === "filled" || x.state === "zero" ? x.sugarG : null));
  const drinks = d.weeks
    ? d.weeks.map((w) => w.drinks)
    : daily.map((x) => (x.state === "filled" || x.state === "zero" ? x.drinks : null));

  return (
    <RespondentShell>
      {sp.tersimpan && (
        <p className="alert alert-info" role="status">
          🎉 Catatanmu tersimpan. Terima kasih sudah mencatat!
        </p>
      )}

      <section className="hero-card stack">
        <h1>
          Halo, {r.label}! <span aria-hidden="true">👋</span>
        </h1>
        <p style={{ margin: 0 }}>
          {inPeriod
            ? `Hari ke-${d.studyDay} dari ${d.durationDays}. Yuk, terus catat kebiasaanmu!`
            : `Periode ${d.durationDays} hari sudah selesai. Kamu tetap bisa mencatat kapan saja.`}
        </p>
      </section>

      <section className="card stack" aria-labelledby="today-h">
        <div className="row spread">
          <h2 id="today-h" style={{ margin: 0 }}>
            Hari ini
          </h2>
          <DayStatusBadge state={t.state} />
        </div>
        <div className="stats">
          <div className="stat">
            <div className="small muted">Minuman manis</div>
            <div className="value">
              {t.drinks} <small>porsi</small>
            </div>
          </div>
          <div className="stat">
            <div className="small muted">Perkiraan gula</div>
            <div className="value">
              ±{t.sugarG} <small>g</small>
            </div>
          </div>
        </div>
        <Link className="btn btn-primary btn-block" href="/catat">
          ＋ Catat minuman
        </Link>
        {t.state === "empty" && <ZeroDayButton date={d.today} />}
        {t.state === "zero" && <ZeroDayButton date={d.today} undo />}
      </section>

      <section className="card stack" aria-labelledby="chart-h">
        <div className="row spread">
          <h2 id="chart-h" style={{ margin: 0 }}>
            Perkembanganmu
          </h2>
          <nav className="segmented" aria-label="Rentang waktu">
            {(Object.keys(RANGES) as RangeKey[]).map((k) => (
              <Link
                key={k}
                href={`/beranda?range=${k}`}
                aria-current={k === range ? "true" : undefined}
              >
                {RANGES[k].label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          {formatLocalDate(d.from)} – {formatLocalDate(d.to)}
          {range === "2w" && " (periode penelitian)"}
          {range === "1y" && " · dijumlah per minggu"}
        </p>

        <h3 style={{ margin: 0 }}>Perkiraan gula harian</h3>
        <SugarLineChart labels={labels} values={sugar} label="Perkiraan gula (g)" />
        <h3 style={{ margin: 0 }}>Jumlah minuman</h3>
        <DrinksBarChart labels={labels} values={drinks} />
        <p className="small" style={{ margin: 0 }}>
          <strong>Ringkasan:</strong> {d.summary.totalDrinks} porsi minuman manis dengan perkiraan
          gula total ±{d.summary.totalSugar} g. Tercatat {d.summary.recordedDays} hari (termasuk{" "}
          {d.summary.zeroDays} hari Nol), {d.summary.emptyDays} hari belum diisi.
          {d.summary.recordedDays > 0 &&
            ` Rata-rata ±${d.summary.avgSugarPerRecordedDay} g per hari tercatat.`}
        </p>
      </section>

      <section className="card stack" aria-labelledby="comp-h">
        <h2 id="comp-h" style={{ margin: 0 }}>
          Jenis minuman
        </h2>
        {d.composition.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Belum ada catatan minuman di rentang ini.
          </p>
        ) : (
          <>
            <CompositionChart items={d.composition} />
            <ul className="small" style={{ margin: 0, paddingLeft: "1.1rem" }}>
              {d.composition.map((c) => (
                <li key={c.beverage}>
                  {c.beverage}: {c.servings} porsi
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card stack" aria-labelledby="cal-h">
        <h2 id="cal-h" style={{ margin: 0 }}>
          Kalender {d.durationDays} hari
        </h2>
        <div className="calendar" role="list">
          {d.calendar.map((c) => (
            <div
              key={c.date}
              role="listitem"
              className={`cal-day ${c.state}`}
              aria-label={`Hari ke-${c.studyDay}, ${formatLocalDate(c.date)}: ${
                {
                  filled: "terisi",
                  zero: "Nol",
                  empty: "belum diisi",
                  future: "akan datang",
                  before: "",
                }[c.state]
              }`}
              title={formatLocalDate(c.date)}
            >
              {c.studyDay}
            </div>
          ))}
        </div>
        <div className="legend" aria-hidden="true">
          <span className="l-filled">Terisi</span>
          <span className="l-zero">Nol</span>
          <span className="l-empty">Belum diisi</span>
          <span className="l-future">Akan datang</span>
        </div>
      </section>

      <Disclaimer />
    </RespondentShell>
  );
}
