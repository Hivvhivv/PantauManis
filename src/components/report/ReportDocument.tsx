import { CompositionChart, DrinksBarChart, SugarLineChart } from "@/components/DashboardCharts";
import { ReportToolbar } from "@/components/ReportToolbar";
import { formatDateTime, formatLocalDate } from "@/lib/format";
import { categoryColor } from "@/lib/palette";
import { PDF_SECTIONS, type PdfSection } from "@/lib/pdf-sections";
import type { allRespondentsPdf } from "@/server/modules/export/report";
import { overviewRow } from "@/server/modules/export/report";
import type { RespondentReport } from "@/server/modules/respondents/results";

type Overview = NonNullable<Awaited<ReturnType<typeof allRespondentsPdf>>["overview"]>;

const shortDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${d}T00:00:00Z`),
  );
const dash = (v: number | string | null | undefined) => (v === null || v === undefined ? "—" : v);
const STATE_TEXT = {
  filled: "Terisi",
  zero: "Nol",
  empty: "Belum diisi",
  future: "—",
  before: "—",
};

/** Laporan PDF siap cetak A4 (ADR-009). Dicetak lewat dialog "Simpan sebagai PDF" browser. */
export function ReportDocument({
  title,
  staffName,
  sections,
  people,
  overview = null,
}: {
  title: string;
  staffName: string;
  sections: PdfSection[];
  people: RespondentReport[];
  overview?: Overview | null;
}) {
  const personSections = sections.filter((s) => s !== "keseluruhan");
  return (
    <article className="report">
      <ReportToolbar />
      <header className="report-cover">
        <div className="report-brand">
          <span>PantauManis</span>
          <span className="report-secret">Rahasia · data pribadi peserta</span>
        </div>
        <h1>{title}</h1>
        <dl className="report-meta">
          <dt>Dibuat</dt>
          <dd>{formatDateTime(new Date())}</dd>
          <dt>Oleh</dt>
          <dd>{staffName}</dd>
          <dt>Responden</dt>
          <dd>{people.length}</dd>
          <dt>Bagian</dt>
          <dd>{sections.map((s) => PDF_SECTIONS[s]).join(" · ")}</dd>
        </dl>
      </header>

      {overview && <OverviewSection overview={overview} />}
      {personSections.length > 0 &&
        people.map((p) => <PersonSection key={p.id} p={p} sections={personSections} />)}

      <footer className="report-footer">
        PantauManis bukan alat diagnosis diabetes dan tidak menggantikan konsultasi dengan tenaga
        kesehatan. Semua angka gula adalah perkiraan. Hari &quot;Belum diisi&quot; berbeda dengan
        hari &quot;Nol&quot; (tidak minum minuman manis) dan tidak ikut dirata-rata.
      </footer>
    </article>
  );
}

function OverviewSection({ overview }: { overview: Overview }) {
  const d = overview.dashboard;
  const labels = d.perDay.map((x) => `H${x.studyDay}`);
  const compTotal = d.composition.reduce((s, c) => s + c.servings, 0);
  return (
    <section className="report-page">
      <h2 className="report-h2">Ringkasan keseluruhan</h2>
      <div className="report-kpis">
        <Kpi label="Total responden" value={d.total} />
        {d.counts.map((c) => (
          <Kpi key={c.key} label={c.label} value={c.value} />
        ))}
        <Kpi
          label="Rata-rata kelengkapan"
          value={d.avgCompleteness === null ? "—" : `${d.avgCompleteness}%`}
        />
        <Kpi label="Pretest / posttest" value={`${d.pretestPct}% / ${d.posttestPct}%`} />
      </div>

      <h3 className="report-h3">Rata-rata perkiraan gula per hari penelitian (g)</h3>
      <SugarLineChart labels={labels} values={d.perDay.map((x) => (x.n ? x.avgSugarG : null))} />
      <div className="report-cols">
        <div>
          <h3 className="report-h3">Rata-rata jumlah minuman</h3>
          <DrinksBarChart
            labels={labels}
            values={d.perDay.map((x) => (x.n ? x.avgDrinks : null))}
          />
        </div>
        <div>
          <h3 className="report-h3">Komposisi jenis minuman</h3>
          <Composition items={d.composition} total={compTotal} />
        </div>
      </div>
      <p className="report-note">
        Rata-rata per hari hanya dari responden yang mencatat (Terisi atau Nol) di hari itu: n ={" "}
        {d.perDay.map((x) => x.n).join(", ")} untuk hari ke-1 s.d. ke-{d.durationDays}.
      </p>

      <h3 className="report-h3">Corong penyelesaian</h3>
      <div className="report-funnel">
        {d.funnel.map((f) => (
          <div key={f.label}>
            <strong>{f.value}</strong>
            <span>{f.label}</span>
          </div>
        ))}
      </div>

      <h3 className="report-h3">Ringkasan per responden</h3>
      <table className="report-table">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Nama</th>
            <th scope="col">Status</th>
            <th scope="col">Tercatat</th>
            <th scope="col">Nol</th>
            <th scope="col">Gula/hari</th>
            <th scope="col">Pre</th>
            <th scope="col">Post</th>
          </tr>
        </thead>
        <tbody>
          {overview.rows.length === 0 && (
            <tr>
              <td colSpan={8}>Belum ada responden.</td>
            </tr>
          )}
          {overview.rows.map((r) => (
            <tr key={r.label}>
              <td>{r.label}</td>
              <td>{r.fullName ?? "—"}</td>
              <td>{r.status}</td>
              <td>{r.recorded === null ? "—" : `${r.recorded}/${r.elapsed}`}</td>
              <td>{dash(r.zeroDays)}</td>
              <td>{r.avgSugarG === null ? "—" : `±${r.avgSugarG} g`}</td>
              <td>{dash(r.pretestScore)}</td>
              <td>{dash(r.posttestScore)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function PersonSection({ p, sections }: { p: RespondentReport; sections: PdfSection[] }) {
  const row = overviewRow(p);
  const has = (s: PdfSection) => sections.includes(s);
  let n = 0;
  const num = () => ++n;

  return (
    <section className="report-page">
      <header className="report-person">
        <div>
          <p className="report-id">
            {p.label}
            {p.initials ? ` · ${p.initials}` : ""}
          </p>
          <h2>{p.fullName ?? "Nama belum diisi"}</h2>
        </div>
        <span className="report-chip">{row.status}</span>
      </header>
      <div className="report-kpis">
        <Kpi
          label="Hari penelitian"
          value={p.started ? `${p.dashboard.studyDay}/${p.dashboard.durationDays}` : "—"}
        />
        <Kpi
          label="Hari tercatat"
          value={row.recorded === null ? "—" : `${row.recorded}/${row.elapsed}`}
        />
        <Kpi label="Hari Nol" value={dash(row.zeroDays)} />
        <Kpi
          label="Rata-rata gula/hari"
          value={row.avgSugarG === null ? "—" : `±${row.avgSugarG} g`}
        />
      </div>

      {!p.started ? (
        <p className="report-note">
          Responden belum menyelesaikan persetujuan dan kuesioner awal, jadi belum ada data
          pencatatan.
        </p>
      ) : (
        <>
          {has("ringkasan") && (
            <Block n={num()} title="Ringkasan & grafik">
              <Charts p={p} />
            </Block>
          )}
          {has("kalender") && (
            <Block
              n={num()}
              title={`Kalender kelengkapan (hari ke-1: ${formatLocalDate(p.dayOne)})`}
            >
              <div className="report-calendar">
                {p.dashboard.calendar.map((c) => (
                  <div key={c.date} className={`cal-day ${c.state}`}>
                    <strong>{c.studyDay}</strong>
                    <span>{STATE_TEXT[c.state]}</span>
                  </div>
                ))}
              </div>
              <p className="legend">
                <span className="l-filled">Terisi</span>
                <span className="l-zero">Nol (tidak minum)</span>
                <span className="l-empty">Belum diisi</span>
              </p>
            </Block>
          )}
          {has("log") && (
            <Block n={num()} title={`Log konsumsi (${p.logs.length} catatan)`}>
              <LogTable logs={p.logs} />
            </Block>
          )}
          {has("target") && (
            <Block n={num()} title="Target">
              <Goals goals={p.goals} />
            </Block>
          )}
        </>
      )}
      {has("kuesioner") && (
        <Block n={num()} title="Pretest & posttest">
          <Questionnaires pre={p.pretest} post={p.posttest} />
        </Block>
      )}
      {has("edukasi") && p.started && (
        <Block n={num()} title={`Edukasi (${p.education.length} materi dibaca)`}>
          {p.education.length === 0 ? (
            <p className="report-note">Belum membaca materi edukasi.</p>
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  <th scope="col">Materi</th>
                  <th scope="col">Dibaca</th>
                  <th scope="col">Kuis pertama / terakhir</th>
                  <th scope="col">Percobaan</th>
                </tr>
              </thead>
              <tbody>
                {p.education.map((e) => (
                  <tr key={e.title}>
                    <td>{e.title}</td>
                    <td>{formatDateTime(e.readAt)}</td>
                    <td>
                      {e.firstQuizScore === null ? "—" : `${e.firstQuizScore} / ${e.lastQuizScore}`}
                    </td>
                    <td>{e.quizAttempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Block>
      )}
    </section>
  );
}

type Started = Extract<RespondentReport, { started: true }>;

function Charts({ p }: { p: Started }) {
  const d = p.dashboard;
  const days = d.days.filter((x) => x.state !== "before");
  const recorded = (s: string) => s === "filled" || s === "zero";
  const labels = days.map((x) => shortDate(x.date));
  const goal = p.goals.active;
  const compTotal = d.composition.reduce((s, c) => s + c.servings, 0);
  return (
    <>
      <h3 className="report-h3">Perkiraan gula harian (g)</h3>
      <SugarLineChart
        labels={labels}
        values={days.map((x) => (recorded(x.state) ? x.sugarG : null))}
        target={goal?.metric === "sugar" ? goal.targetValue : null}
      />
      <div className="report-cols">
        <div>
          <h3 className="report-h3">Jumlah minuman per hari</h3>
          <DrinksBarChart
            labels={labels}
            values={days.map((x) => (recorded(x.state) ? x.drinks : null))}
            target={goal?.metric === "drinks" ? goal.targetValue : null}
          />
        </div>
        <div>
          <h3 className="report-h3">Komposisi jenis minuman</h3>
          <Composition items={d.composition} total={compTotal} />
        </div>
      </div>
      <p className="report-note">
        Celah pada grafik = hari Belum diisi (bukan 0).
        {goal ? " Garis putus-putus = target pribadi." : ""}
      </p>
    </>
  );
}

function Composition({
  items,
  total,
}: {
  items: { beverage: string; servings: number }[];
  total: number;
}) {
  if (items.length === 0) return <p className="report-note">Belum ada catatan minuman.</p>;
  return (
    <div className="report-comp">
      <CompositionChart items={items} total={total} />
      <ul className="legend-list small">
        {items.map((c, i) => (
          <li key={c.beverage}>
            <span className="swatch" style={{ background: categoryColor(i) }} />
            <span>{c.beverage}</span>
            <span className="num">{c.servings}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LogTable({ logs }: { logs: Started["logs"] }) {
  if (logs.length === 0) return <p className="report-note">Belum ada catatan.</p>;
  return (
    <table className="report-table">
      <thead>
        <tr>
          <th scope="col">Waktu (WIB)</th>
          <th scope="col">Hari</th>
          <th scope="col">Minuman</th>
          <th scope="col">Volume × porsi</th>
          <th scope="col">Gula</th>
          <th scope="col">Perkiraan</th>
          <th scope="col">Keterangan</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((l) => (
          <tr key={l.id}>
            <td>{l.consumedAt}</td>
            <td>{l.studyDay}</td>
            <td>{l.beverage}</td>
            <td>
              {l.volumeMl} ml × {l.servings}
            </td>
            <td>{l.sugarLevel ?? "—"}</td>
            <td>±{l.sugarG} g</td>
            <td>
              {[l.isBackfill && "susulan", l.isOutOfPeriod && "luar periode", l.note]
                .filter(Boolean)
                .join(" · ") || "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Goals({ goals }: { goals: Started["goals"] }) {
  if (!goals.active) return <p className="report-note">Belum menetapkan target.</p>;
  return (
    <>
      <p style={{ margin: 0 }}>
        <strong>{goals.active.label}</strong>
        <br />
        {goals.message}
      </p>
      {goals.history.length > 1 && (
        <ul className="report-list">
          {goals.history.map((h) => (
            <li key={h.id}>
              {h.label}: mulai {formatDateTime(h.validFrom)}
              {h.validTo ? `, sampai ${formatDateTime(h.validTo)}` : " (aktif)"}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

type Q = RespondentReport["pretest"];

/** Pretest dan posttest punya soal berbeda (ADR-010): satu tabel per kuesioner. */
function Questionnaires({ pre, post }: { pre: Q; post: Q }) {
  if (!pre && !post) return <p className="report-note">Instrumen kuesioner belum tersedia.</p>;
  return (
    <>
      <p style={{ margin: 0 }}>
        <strong>Skor pretest {pre?.score ?? "—"}</strong> ·{" "}
        <strong>Skor posttest {post?.score ?? "—"}</strong>
      </p>
      {(
        [
          ["Pretest", pre],
          ["Posttest", post],
        ] as const
      ).map(([title, q]) =>
        q ? (
          <table key={title} className="report-table">
            <thead>
              <tr>
                <th scope="col">
                  {title} ·{" "}
                  {!q.status
                    ? "belum diisi"
                    : q.status === "draft"
                      ? "draf"
                      : `terkirim ${formatDateTime(q.submittedAt)}`}
                </th>
                <th scope="col">Jawaban</th>
              </tr>
            </thead>
            <tbody>
              {q.answers.map((a) => (
                <tr key={a.order}>
                  <td>
                    {a.order}. {a.text}
                  </td>
                  <td>{a.answer ?? "—"}</td>
                </tr>
              ))}
              <tr className="report-total">
                <th scope="row">Skor</th>
                <td>{q.score ?? "—"}</td>
              </tr>
            </tbody>
          </table>
        ) : null,
      )}
    </>
  );
}

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="report-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Block({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="report-block">
      <h3 className="report-h2">
        <span className="report-num">{n}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}
