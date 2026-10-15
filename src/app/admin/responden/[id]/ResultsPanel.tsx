"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { formatDateTime, formatLocalDate } from "@/lib/format";
import { categoryColor } from "@/lib/palette";
import { CompositionChart, DrinksBarChart, SugarLineChart } from "@/components/DashboardCharts";
import type { RespondentResults } from "@/server/modules/respondents/results";

const shortDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${d}T00:00:00Z`),
  );

const STATE_TEXT = {
  filled: "Terisi",
  zero: "Nol",
  empty: "Belum diisi",
  future: "—",
  before: "—",
} as const;

/**
 * "Lihat Hasil Responden" (FR-A-04, ADR-006): data hasil TIDAK dimuat bersama halaman detail.
 * Diambil dari server hanya saat tombol diklik; setiap pengambilan dicatat di audit log.
 */
export function ResultsPanel({ id }: { id: string }) {
  const [data, setData] = useState<RespondentResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await api<RespondentResults>(`/api/admin/respondents/${id}/results`);
    setLoading(false);
    if (res.ok) setData(res.data);
    else setError(res.error.message);
  }

  if (!data) {
    return (
      <section className="card stack">
        <h2 style={{ margin: 0 }}>Hasil responden</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Data hasil hanya dimuat saat dibutuhkan, dan setiap pembukaan dicatat di log audit.
        </p>
        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}
        <span className="row">
          <button type="button" className="btn btn-primary" onClick={load} disabled={loading}>
            {loading ? "Memuat hasil…" : "Lihat Hasil Responden"}
          </button>
          <PdfLink id={id} />
        </span>
      </section>
    );
  }

  return (
    <section className="card stack results" aria-labelledby="results-h" aria-live="polite">
      <div className="row spread">
        <h2 id="results-h" style={{ margin: 0 }}>
          Hasil responden {data.label}
        </h2>
        <span className="row">
          <a className="btn btn-sm" href={`/api/admin/respondents/${id}/export`} download>
            Ekspor Data Responden Ini
          </a>
          <PdfLink id={id} small />
          <button type="button" className="btn btn-sm" onClick={() => setData(null)}>
            Sembunyikan Hasil
          </button>
        </span>
      </div>

      {!data.started ? (
        <p className="muted" style={{ margin: 0 }}>
          Responden belum menyelesaikan persetujuan dan kuesioner awal, jadi belum ada data
          pencatatan.
        </p>
      ) : (
        <StartedResults data={data} />
      )}

      <QuestionnaireComparison pre={data.pretest} post={data.posttest} />
    </section>
  );
}

/** PDF hasil responden ini (dibuka di tab baru, dicatat di log audit). */
function PdfLink({ id, small = false }: { id: string; small?: boolean }) {
  return (
    <a
      className={small ? "btn btn-sm" : "btn"}
      href={`/admin/responden/${id}/pdf`}
      target="_blank"
      rel="noopener"
    >
      Unduh PDF
    </a>
  );
}

export function StartedResults({ data }: { data: Extract<RespondentResults, { started: true }> }) {
  const d = data.dashboard;
  const days = d.days.filter((x) => x.state !== "before");
  const recorded = (s: string) => s === "filled" || s === "zero";
  const labels = days.map((x) => shortDate(x.date));
  const g = data.goals;
  const compTotal = d.composition.reduce((s, c) => s + c.servings, 0);

  return (
    <>
      <p className="small muted" style={{ margin: 0 }}>
        Hari ke-1: {formatLocalDate(data.dayOne)} · hari ini hari ke-{d.studyDay} · kelengkapan{" "}
        {d.completeness.filled}/{d.completeness.elapsed} hari
      </p>

      <div className="dash-grid two-one">
        <div className="stack">
          <h3 className="chart-title">Perkiraan gula harian (g)</h3>
          <SugarLineChart
            labels={labels}
            values={days.map((x) => (recorded(x.state) ? x.sugarG : null))}
            target={g.active?.metric === "sugar" ? g.active.targetValue : null}
          />
          <h3 className="chart-title">Jumlah minuman</h3>
          <DrinksBarChart
            labels={labels}
            values={days.map((x) => (recorded(x.state) ? x.drinks : null))}
            target={g.active?.metric === "drinks" ? g.active.targetValue : null}
          />
        </div>
        <div className="stack">
          <h3 className="chart-title">Komposisi jenis</h3>
          {d.composition.length === 0 ? (
            <p className="muted small">Belum ada catatan minuman.</p>
          ) : (
            <>
              <CompositionChart items={d.composition} total={compTotal} />
              <ul className="legend-list small">
                {d.composition.map((c, i) => (
                  <li key={c.beverage}>
                    <span className="swatch" style={{ background: categoryColor(i) }} />
                    <span>{c.beverage}</span>
                    <span className="num">{c.servings}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <h3 className="chart-title">Kalender kelengkapan</h3>
      <div className="calendar" role="list">
        {d.calendar.map((c) => (
          <div
            key={c.date}
            role="listitem"
            className={`cal-day ${c.state}`}
            aria-label={`Hari ke-${c.studyDay}: ${STATE_TEXT[c.state]}`}
            title={formatLocalDate(c.date)}
          >
            {c.studyDay}
          </div>
        ))}
      </div>

      <h3 className="chart-title">Target</h3>
      {g.active ? (
        <p style={{ margin: 0 }}>
          <strong>{g.active.label}</strong>
          <br />
          <span className="small">{g.message}</span>
        </p>
      ) : (
        <p className="muted small" style={{ margin: 0 }}>
          Belum menetapkan target.
        </p>
      )}
      {g.history.length > 1 && (
        <ul className="small" style={{ margin: 0 }}>
          {g.history.map((h) => (
            <li key={h.id}>
              {h.label} — mulai {formatDateTime(h.validFrom)}
              {h.validTo ? `, sampai ${formatDateTime(h.validTo)}` : " (aktif)"}
            </li>
          ))}
        </ul>
      )}

      <h3 className="chart-title">Edukasi ({data.education.length} materi dibaca)</h3>

      {data.education.length === 0 ? (
        <p className="muted small" style={{ margin: 0 }}>
          Belum membaca materi edukasi.
        </p>
      ) : (
        <div className="table-wrap">
          <table style={{ minWidth: 0 }}>
            <thead>
              <tr>
                <th scope="col">Materi</th>

                <th scope="col">Dibaca</th>

                <th scope="col">Kuis (pertama / terakhir)</th>

                <th scope="col">Percobaan</th>
              </tr>
            </thead>

            <tbody>
              {data.education.map((e) => (
                <tr key={e.title}>
                  <td>{e.title}</td>

                  <td className="small">{formatDateTime(e.readAt)}</td>

                  <td>
                    {e.firstQuizScore === null ? "—" : `${e.firstQuizScore} / ${e.lastQuizScore}`}
                  </td>

                  <td>{e.quizAttempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="chart-title">Log konsumsi ({data.logs.length})</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Waktu (WIB)</th>
              <th scope="col">Hari</th>
              <th scope="col">Minuman</th>
              <th scope="col">Volume × porsi</th>
              <th scope="col">Tingkat gula</th>
              <th scope="col">Perkiraan gula</th>
              <th scope="col">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {data.logs.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  Belum ada catatan.
                </td>
              </tr>
            )}
            {data.logs.map((l) => (
              <tr key={l.id}>
                <td>{l.consumedAt}</td>
                <td>{l.studyDay}</td>
                <td>{l.beverage}</td>
                <td>
                  {l.volumeMl} ml × {l.servings}
                </td>
                <td>{l.sugarLevel ?? "—"}</td>
                <td>±{l.sugarG} g</td>
                <td className="small">
                  {[l.isBackfill && "susulan", l.isOutOfPeriod && "luar periode", l.note]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

type Q = RespondentResults["pretest"];

export function QuestionnaireComparison({ pre, post }: { pre: Q; post: Q }) {
  if (!pre) return null;
  const status = (q: Q) =>
    !q || !q.status
      ? "Belum"
      : q.status === "draft"
        ? "Draf"
        : `Terkirim ${formatDateTime(q.submittedAt)}`;
  return (
    <>
      <h3 className="chart-title">Pretest vs posttest</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Pertanyaan</th>
              <th scope="col">Pretest</th>
              <th scope="col">Posttest</th>
            </tr>
          </thead>
          <tbody>
            {pre.answers.map((a, i) => (
              <tr key={a.order}>
                <td>
                  {a.order}. {a.text}
                </td>
                <td>{a.answer ?? "—"}</td>
                <td>{post?.answers[i]?.answer ?? "—"}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">Skor</th>
              <td>{pre.score ?? "—"}</td>
              <td>{post?.score ?? "—"}</td>
            </tr>
            <tr>
              <th scope="row">Status</th>
              <td className="small">{status(pre)}</td>
              <td className="small">{status(post)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
