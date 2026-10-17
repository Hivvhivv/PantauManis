import type { Metadata } from "next";
import Link from "next/link";
import { CompositionChart, DrinksBarChart, SugarLineChart } from "@/components/DashboardCharts";
import { DayStatusBadge } from "@/components/DayStatusBadge";
import { Disclaimer } from "@/components/Disclaimer";
import { DrinksIllustration } from "@/components/DrinksIllustration";
import { Icon } from "@/components/Icon";
import { InstallCard } from "@/components/InstallCard";
import { ReminderToggle } from "@/components/ReminderToggle";
import { vapidPublicKey } from "@/server/modules/reminders/service";
import { RespondentShell } from "@/components/RespondentShell";
import { ZeroDayButton } from "@/components/ZeroDayButton";
import { formatLocalDate } from "@/lib/format";
import { categoryColor } from "@/lib/palette";
import type { ReadyRespondent } from "@/server/auth/guards";
import { respondentAtStage } from "@/server/auth/page-guards";
import { PretestGate } from "./PretestGate";
import { getDashboard } from "@/server/modules/consumption/dashboard";
import { getGoalState } from "@/server/modules/goals/service";
import { posttestInfo } from "@/server/modules/questionnaires/service";
import { RANGES, type DayState, type RangeKey } from "@/server/modules/study/series";

export const metadata: Metadata = { title: "Beranda" };

const utcDate = (d: string) => new Date(`${d}T00:00:00Z`);
const shortDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    utcDate(d),
  );
const longDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(utcDate(d));

const STATE_LABEL: Record<DayState, string> = {
  filled: "terisi",
  zero: "Nol (tidak minum)",
  empty: "belum diisi",
  future: "akan datang",
  before: "",
};
const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/** Cincin progres sederhana (SVG). */
function Ring({ value, max }: { value: number; max: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true" className="ring">
      <circle cx="44" cy="44" r={r} fill="none" stroke="var(--bg-soft)" strokeWidth="9" />
      <circle
        cx="44"
        cy="44"
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform="rotate(-90 44 44)"
      />
      <text x="44" y="49" textAnchor="middle" className="ring-text">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

/** Dashboard Responden (FR-R-03). Hanya data milik responden yang login. */
export default async function BerandaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resp = await respondentAtStage("home");
  if (!resp.dayOneDate) return <PretestGate id={resp.id} label={resp.label} />;
  const r = resp as ReadyRespondent;
  const vapidKey = vapidPublicKey();
  const sp = await searchParams;
  const range: RangeKey =
    typeof sp.range === "string" && sp.range in RANGES ? (sp.range as RangeKey) : "2w";
  const [d, g, pt] = await Promise.all([getDashboard(r, range), getGoalState(r), posttestInfo(r)]);
  // Garis target hanya pada grafik harian (bukan agregat mingguan 1 tahun).
  const sugarTarget = g.active?.metric === "sugar" && !d.weeks ? g.active.targetValue : null;
  const drinksTarget = g.active?.metric === "drinks" && !d.weeks ? g.active.targetValue : null;
  const t = d.todayPoint;
  const inPeriod = d.studyDay <= d.durationDays;

  // Grafik: hari Belum diisi = null (celah), hari Nol = 0.
  const daily = d.days.filter((x) => x.state !== "before");
  const recordedState = (s: DayState) => s === "filled" || s === "zero";
  const labels = d.weeks
    ? d.weeks.map((w) => `Mgg ${shortDate(w.label)}`)
    : daily.map((x) => shortDate(x.date));
  const sugar = d.weeks
    ? d.weeks.map((w) => w.sugarG)
    : daily.map((x) => (recordedState(x.state) ? x.sugarG : null));
  const drinks = d.weeks
    ? d.weeks.map((w) => w.drinks)
    : daily.map((x) => (recordedState(x.state) ? x.drinks : null));

  const compTotal = d.composition.reduce((s, c) => s + c.servings, 0);
  // Warna per jenis minuman sama di donat, legenda, dan aktivitas terbaru.
  const colorOf = new Map(d.composition.map((c, i) => [c.beverage, categoryColor(i)]));
  const firstWeekday = (utcDate(d.calendar[0]!.date).getUTCDay() + 6) % 7; // Senin = 0
  const comp = d.completeness;

  return (
    <RespondentShell wide label={r.label}>
      {sp.tersimpan && (
        <p className="alert alert-info" role="status">
          🎉 Catatanmu tersimpan. Terima kasih sudah mencatat!
        </p>
      )}

      <InstallCard />
      {vapidKey && <ReminderToggle vapidKey={vapidKey} />}

      {pt.state === "open" && (
        <Link className="reminder" href="/posttest">
          <span className="stat-icon" aria-hidden="true">
            <Icon name="check" />
          </span>
          <span>
            <strong>Kuesioner akhir sudah tersedia</strong>
            <br />
            <span className="small">
              Isi sebelum {formatLocalDate(pt.closes!)}. Hanya beberapa menit!
            </span>
          </span>
          <Icon name="chevron" />
        </Link>
      )}

      {/* Sapaan */}
      <section className="dash-hero">
        <div className="stack">
          <h1>
            Halo, {r.label}! <span aria-hidden="true">👋</span>
          </h1>
          <p className="lead-text">
            {inPeriod
              ? "Yuk, catat minuman manismu hari ini."
              : `Periode ${d.durationDays} hari sudah selesai. Kamu tetap bisa mencatat kapan saja.`}
            <br />
            <span className="muted">Setiap catatan kecil membantu penelitian ini.</span>
          </p>
          <p className="row small muted" style={{ margin: 0 }}>
            <Icon name="calendar" size={18} /> {longDate(d.today)}
          </p>
        </div>
        <div className="hero-progress card">
          <div className="small muted">Hari penelitian</div>
          <div style={{ fontWeight: 800, fontSize: "1.15rem" }}>
            {inPeriod ? `Hari ke-${d.studyDay} dari ${d.durationDays}` : `Hari ke-${d.studyDay}`}
          </div>
          <div
            className="bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={d.durationDays}
            aria-valuenow={Math.min(d.studyDay, d.durationDays)}
            aria-label="Progres periode penelitian"
          >
            <span
              style={{ width: `${(Math.min(d.studyDay, d.durationDays) / d.durationDays) * 100}%` }}
            />
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <DrinksIllustration />
          <p className="hero-quote">
            Langkah kecil,
            <br />
            kebiasaan baru ♡
          </p>
        </div>
      </section>

      {/* Ringkasan hari ini */}
      <section className="card stack" aria-labelledby="today-h">
        <div className="row spread">
          <h2 id="today-h" style={{ margin: 0 }}>
            Ringkasan Hari Ini
          </h2>
          <DayStatusBadge state={t.state} />
        </div>
        <div className="summary-grid">
          <div className="stat">
            <div className="stat-head">
              <span className="stat-icon">
                <Icon name="sugar" />
              </span>
              Perkiraan gula
            </div>
            <div className="value">
              ±{t.sugarG} <small>g</small>
            </div>
            <div className="small muted">dari minuman yang kamu catat hari ini</div>
          </div>
          <div className="stat">
            <div className="stat-head">
              <span className="stat-icon">
                <Icon name="cup" />
              </span>
              Jumlah minuman
            </div>
            <div className="value">
              {t.drinks} <small>porsi</small>
            </div>
            <div className="small muted">minuman manis hari ini</div>
          </div>
          <div className="stat stat-ring">
            <div>
              <div className="stat-head">
                <span className="stat-icon">
                  <Icon name="check" />
                </span>
                Kelengkapan catatan
              </div>
              <div className="value">
                {comp.filled}
                <small>/{comp.elapsed} hari</small>
              </div>
              <div className="small muted">tercatat (termasuk hari Nol)</div>
            </div>
            <Ring value={comp.filled} max={comp.elapsed} />
          </div>
        </div>
        <Link className="btn btn-primary btn-block btn-lg" href="/catat">
          <Icon name="cup" /> Catat minuman
        </Link>
        {t.state === "empty" && <ZeroDayButton date={d.today} />}
        {t.state === "zero" && <ZeroDayButton date={d.today} undo />}
      </section>

      {/* Target pribadi */}
      <section className="card target-card" aria-labelledby="goal-h">
        <span className="stat-icon big" aria-hidden="true">
          <Icon name="target" size={26} />
        </span>
        <div>
          <h2 id="goal-h" style={{ margin: 0, fontSize: "1.1rem" }}>
            {g.active ? g.active.label : "Belum ada target"}
          </h2>
          <p className="small" style={{ margin: "0.2rem 0 0" }}>
            {g.message}
          </p>
        </div>
        <Link className="btn btn-sm" href="/target">
          {g.active ? "Lihat target" : "Tetapkan target"}
        </Link>
      </section>

      {/* Grafik + komposisi */}
      <div className="dash-grid two-one">
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
          <h3 className="chart-title">
            Perkiraan gula <span className="muted">(gram)</span>
          </h3>
          <SugarLineChart labels={labels} values={sugar} target={sugarTarget} />
          <h3 className="chart-title">Jumlah minuman</h3>
          <DrinksBarChart labels={labels} values={drinks} target={drinksTarget} />
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
              <CompositionChart items={d.composition} total={compTotal} />
              <ul className="legend-list">
                {d.composition.map((c, i) => (
                  <li key={c.beverage}>
                    <span className="swatch" style={{ background: categoryColor(i) }} />
                    <span>{c.beverage}</span>
                    <span className="num">
                      {c.servings}{" "}
                      <span className="muted">({Math.round((c.servings / compTotal) * 100)}%)</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      {/* Kalender + aktivitas */}
      <div className="dash-grid one-one">
        <section className="card stack" aria-labelledby="cal-h">
          <h2 id="cal-h" style={{ margin: 0 }}>
            Kalender {d.durationDays} hari
          </h2>
          <div className="week-calendar">
            {WEEKDAYS.map((w) => (
              <div key={w} className="wd" aria-hidden="true">
                {w}
              </div>
            ))}
            {Array.from({ length: firstWeekday }, (_, i) => (
              <div key={`pad-${i}`} aria-hidden="true" />
            ))}
            {d.calendar.map((c) => (
              <div
                key={c.date}
                className={`wc ${c.state}${c.date === d.today ? " today" : ""}`}
                aria-label={`Hari ke-${c.studyDay}, ${formatLocalDate(c.date)}: ${STATE_LABEL[c.state]}`}
                title={`Hari ke-${c.studyDay}`}
              >
                <span className="n">{utcDate(c.date).getUTCDate()}</span>
                <span className="dot" aria-hidden="true" />
              </div>
            ))}
          </div>
          <div className="legend" aria-hidden="true">
            <span className="l-filled">Terisi</span>
            <span className="l-zero">Nol</span>
            <span className="l-empty">Belum diisi</span>
            <span className="l-future">Akan datang</span>
          </div>
          <Link className="today-link" href="/riwayat">
            <span className="stat-icon">
              <Icon name="calendar" />
            </span>
            <span>
              <strong>{formatLocalDate(d.today)} (hari ini)</strong>
              <br />
              <span className="small muted">
                {t.drinks} porsi · ±{t.sugarG} g gula
              </span>
            </span>
            <Icon name="chevron" />
          </Link>
        </section>

        <section className="card stack" aria-labelledby="recent-h">
          <div className="row spread">
            <h2 id="recent-h" style={{ margin: 0 }}>
              Aktivitas terbaru
            </h2>
            <Link href="/riwayat" className="small">
              Lihat semua
            </Link>
          </div>
          {d.recent.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Belum ada catatan. Yuk, mulai catat minuman pertamamu!
            </p>
          ) : (
            <ul className="recent-list">
              {d.recent.map((l, i) => (
                <li key={l.id}>
                  <span
                    className="recent-icon"
                    style={{ background: colorOf.get(l.beverage) ?? categoryColor(i) }}
                    aria-hidden="true"
                  >
                    {l.icon}
                  </span>
                  <span>
                    <strong>{l.beverage}</strong>
                    <br />
                    <span className="small muted">
                      {l.volumeMl} ml × {l.servings} porsi
                    </span>
                  </span>
                  <span className="recent-meta">
                    <strong>±{l.sugarG} g</strong>
                    <br />
                    <span className="small muted">
                      {l.date === d.today ? l.time : `${shortDate(l.date)}, ${l.time}`}
                    </span>
                  </span>
                  {l.editable ? (
                    <Link
                      className="btn btn-sm"
                      href={`/catat/${l.id}`}
                      aria-label={`Ubah catatan ${l.beverage} pukul ${l.time}`}
                    >
                      Ubah
                    </Link>
                  ) : (
                    <span />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Disclaimer />
    </RespondentShell>
  );
}
