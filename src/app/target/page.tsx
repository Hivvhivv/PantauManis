import type { Metadata } from "next";
import { Disclaimer } from "@/components/Disclaimer";
import { RespondentShell } from "@/components/RespondentShell";
import { formatDateTime, formatLocalDate } from "@/lib/format";
import { respondentAtStage } from "@/server/auth/page-guards";
import { getGoalState } from "@/server/modules/goals/service";
import { GoalForm } from "./GoalForm";

export const metadata: Metadata = { title: "Target" };

const shortDay = (d: string) =>
  new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${d}T00:00:00Z`),
  );

/** Target pribadi dan umpan balik (FR-R-06). */
export default async function TargetPage() {
  const r = await respondentAtStage("ready");
  const g = await getGoalState(r);

  return (
    <RespondentShell wide label={r.label}>
      <section className="dash-hero page-hero">
        <div className="stack">
          <p className="eyebrow">Target kamu</p>
          <h1>{g.active ? g.active.label : "Yuk, tetapkan target pribadimu"}</h1>
          <p className="lead-text muted" style={{ margin: 0 }}>
            Target ini milikmu sendiri. Pilih yang terasa realistis, lalu lihat progresnya setiap
            minggu.
          </p>
        </div>
      </section>

      <div className="dash-grid one-one">
        <section className="card stack" aria-labelledby="progress-h">
          <h2 id="progress-h" style={{ margin: 0 }}>
            Progres 7 hari terakhir
          </h2>
          <p className="feedback" role="status">
            {g.message}
          </p>
          {g.progress && g.progress.days.length > 0 && (
            <ol className="goal-days" aria-label="Hasil per hari">
              {g.progress.days.map((d) => (
                <li
                  key={d.date}
                  className={d.achieved === true ? "yes" : d.achieved === false ? "no" : "none"}
                >
                  <span className="small">{shortDay(d.date)}</span>
                  <span className="mark" aria-hidden="true">
                    {d.achieved === true ? "✓" : d.achieved === false ? "•" : "–"}
                  </span>
                  <span className="sr-only">
                    {formatLocalDate(d.date)}:{" "}
                    {d.achieved === true
                      ? "target tercapai"
                      : d.achieved === false
                        ? "di atas target"
                        : "belum diisi"}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {g.progress && (
            <div className="legend" aria-hidden="true">
              <span className="l-zero">Tercapai</span>
              <span className="l-over">Di atas target</span>
              <span className="l-empty">Belum diisi</span>
            </div>
          )}
        </section>

        <section className="card stack" aria-labelledby="form-h">
          <h2 id="form-h" style={{ margin: 0 }}>
            {g.active ? "Ubah target" : "Tetapkan target"}
          </h2>
          {g.canChange ? (
            <GoalForm
              initialMetric={g.active?.metric ?? "drinks"}
              initialValue={g.active?.targetValue ?? null}
            />
          ) : (
            <p className="alert alert-info" style={{ margin: 0 }}>
              Target bisa diubah lagi mulai <strong>{formatLocalDate(g.canChangeFrom!)}</strong>.
              Target cukup diubah sekali per minggu agar progresnya bisa terlihat.
            </p>
          )}
        </section>
      </div>

      {g.history.length > 0 && (
        <section className="card stack" aria-labelledby="hist-h">
          <h2 id="hist-h" style={{ margin: 0 }}>
            Riwayat target
          </h2>
          <ul className="recent-list">
            {g.history.map((h) => (
              <li key={h.id} style={{ gridTemplateColumns: "1fr auto" }}>
                <span>
                  <strong>{h.label}</strong>
                  <br />
                  <span className="small muted">
                    Mulai {formatDateTime(h.validFrom)}
                    {h.validTo ? ` · sampai ${formatDateTime(h.validTo)}` : ""}
                  </span>
                </span>
                {!h.validTo && <span className="status-badge st-zero">Aktif</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Disclaimer />
    </RespondentShell>
  );
}
