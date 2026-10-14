import type { Metadata } from "next";
import Link from "next/link";
import { DayStatusBadge } from "@/components/DayStatusBadge";
import { RespondentShell } from "@/components/RespondentShell";
import { ZeroDayButton } from "@/components/ZeroDayButton";
import { formatLocalDate } from "@/lib/format";
import { respondentAtStage } from "@/server/auth/page-guards";
import { listBeverageTypes } from "@/server/modules/beverages/service";
import { getHistory } from "@/server/modules/consumption/dashboard";
import { historyQuerySchema } from "@/server/modules/consumption/schemas";
import { SUGAR_LEVEL_LABELS } from "@/server/modules/study/estimate";

export const metadata: Metadata = { title: "Riwayat" };

/** Riwayat per hari (FR-R-04), filter tanggal dan jenis minuman. */
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

  return (
    <RespondentShell>
      <h1 style={{ margin: 0 }}>Riwayat</h1>

      <form className="filters card" method="get" role="search">
        <div>
          <label htmlFor="from">Dari</label>
          <input id="from" name="from" type="date" defaultValue={h.from} />
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
            <option value="">Semua</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn" type="submit">
          Terapkan
        </button>
      </form>

      {h.days.length === 0 && <p className="muted">Belum ada hari yang bisa ditampilkan.</p>}

      {h.days.map((d) => (
        <section key={d.date} className="card day-card" aria-label={formatLocalDate(d.date)}>
          <div className="day-head">
            <div>
              <strong>{formatLocalDate(d.date)}</strong>{" "}
              <span className="small muted">· Hari ke-{d.studyDay}</span>
            </div>
            <DayStatusBadge state={d.state} />
          </div>

          {d.logs.map((l) => (
            <div key={l.id} className="log-item">
              <span className="emoji" aria-hidden="true">
                {l.icon}
              </span>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {l.beverage} <span className="small muted">· {l.time}</span>
                </div>
                <div className="small muted">
                  {l.volumeMl} ml × {l.servings} porsi
                  {l.sugarLevel && ` · ${SUGAR_LEVEL_LABELS[l.sugarLevel]}`} · perkiraan ±{l.sugarG}{" "}
                  g{l.isBackfill && " · susulan"}
                  {l.isOutOfPeriod && " · di luar periode"}
                </div>
                {l.note && <div className="small">“{l.note}”</div>}
              </div>
              {d.editable && (
                <Link
                  className="btn btn-sm"
                  href={`/catat/${l.id}`}
                  aria-label={`Ubah catatan ${l.beverage} pukul ${l.time}`}
                >
                  Ubah
                </Link>
              )}
            </div>
          ))}

          {d.editable && d.state === "empty" && !query.beverageTypeId && (
            <div style={{ marginTop: "0.75rem" }}>
              <ZeroDayButton date={d.date} label="Tidak minum minuman manis di hari ini" />
            </div>
          )}
          {d.editable && d.state === "zero" && (
            <div style={{ marginTop: "0.75rem" }}>
              <ZeroDayButton date={d.date} undo />
            </div>
          )}
        </section>
      ))}
    </RespondentShell>
  );
}
