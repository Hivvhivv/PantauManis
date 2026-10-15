import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CompositionChart, DrinksBarChart, SugarLineChart } from "@/components/DashboardCharts";
import { Disclaimer } from "@/components/Disclaimer";
import { ReportToolbar } from "@/components/ReportToolbar";
import { formatDateTime } from "@/lib/format";
import { categoryColor } from "@/lib/palette";
import { pageActor, staffForPage } from "@/server/auth/page-guards";
import { getOverallReport } from "@/server/modules/export/report";

export const metadata: Metadata = { title: "PDF Hasil Keseluruhan" };

const dash = (v: number | null) => (v === null ? "—" : v);

/** PDF dari menu Ekspor: "semua" = keseluruhan, ID responden = PDF responden itu (ADR-009). */
export default async function OverallPdfPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const user = await staffForPage();
  const { r = "semua" } = await searchParams;
  if (r !== "semua") {
    if (!/^[0-9a-f-]{36}$/i.test(r)) notFound();
    redirect(`/admin/responden/${r}/pdf`);
  }
  const { dashboard: d, rows } = await getOverallReport(await pageActor(user));

  const labels = d.perDay.map((x) => `H${x.studyDay}`);
  const compTotal = d.composition.reduce((s, c) => s + c.servings, 0);

  return (
    <article className="report stack">
      <ReportToolbar />
      <header>
        <h1 style={{ margin: 0 }}>Hasil Keseluruhan PantauManis</h1>
        <p className="small muted" style={{ margin: 0 }}>
          Dibuat {formatDateTime(new Date())} oleh {user.name}. Dokumen rahasia: berisi data pribadi
          peserta penelitian.
        </p>
      </header>

      <section className="admin-stats" aria-label="Ringkasan">
        <div className="stat">
          <div className="small muted">Total responden</div>
          <div className="value">{d.total}</div>
        </div>
        {d.counts.map((c) => (
          <div className="stat" key={c.key}>
            <div className="small muted">{c.label}</div>
            <div className="value">{c.value}</div>
          </div>
        ))}
        <div className="stat">
          <div className="small muted">Rata-rata kelengkapan</div>
          <div className="value">{d.avgCompleteness === null ? "—" : `${d.avgCompleteness}%`}</div>
        </div>
        <div className="stat">
          <div className="small muted">Pretest / posttest selesai</div>
          <div className="value">
            {d.pretestPct}% <small>/ {d.posttestPct}%</small>
          </div>
        </div>
      </section>

      <section className="stack">
        <h2 style={{ margin: 0 }}>Rata-rata per hari penelitian</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Dari responden yang mencatat (Terisi atau Nol) di hari tersebut; hari Belum diisi tidak
          ikut dirata-rata.
        </p>
        <h3 className="chart-title">Perkiraan gula (gram)</h3>
        <SugarLineChart labels={labels} values={d.perDay.map((x) => (x.n ? x.avgSugarG : null))} />
        <h3 className="chart-title">Jumlah minuman</h3>
        <DrinksBarChart labels={labels} values={d.perDay.map((x) => (x.n ? x.avgDrinks : null))} />
        <div className="table-wrap">
          <table style={{ minWidth: 0 }}>
            <thead>
              <tr>
                <th scope="col">Hari</th>
                <th scope="col">n</th>
                <th scope="col">Rata-rata gula (g)</th>
                <th scope="col">Rata-rata minuman</th>
              </tr>
            </thead>
            <tbody>
              {d.perDay.map((x) => (
                <tr key={x.studyDay}>
                  <td>Hari ke-{x.studyDay}</td>
                  <td>{x.n}</td>
                  <td>{x.n ? x.avgSugarG : "—"}</td>
                  <td>{x.n ? x.avgDrinks : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="dash-grid two-one">
        <section className="stack">
          <h2 style={{ margin: 0 }}>Komposisi jenis minuman</h2>
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
        </section>
        <section className="stack">
          <h2 style={{ margin: 0 }}>Corong penyelesaian</h2>
          <table style={{ minWidth: 0 }}>
            <tbody>
              {d.funnel.map((f) => (
                <tr key={f.label}>
                  <th scope="row">{f.label}</th>
                  <td>{f.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="stack">
        <h2 style={{ margin: 0 }}>Ringkasan per responden ({rows.length})</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Nama</th>
                <th scope="col">Status</th>
                <th scope="col">Hari tercatat</th>
                <th scope="col">Hari Nol</th>
                <th scope="col">Rata-rata gula/hari</th>
                <th scope="col">Skor pretest</th>
                <th scope="col">Skor posttest</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted">
                    Belum ada responden.
                  </td>
                </tr>
              )}
              {rows.map((p) => (
                <tr key={p.label}>
                  <td>{p.label}</td>
                  <td>{p.fullName ?? "—"}</td>
                  <td>{p.status}</td>
                  <td>{p.recorded === null ? "—" : `${p.recorded}/${p.elapsed}`}</td>
                  <td>{dash(p.zeroDays)}</td>
                  <td>{p.avgSugarG === null ? "—" : `±${p.avgSugarG} g`}</td>
                  <td>{dash(p.pretestScore)}</td>
                  <td>{dash(p.posttestScore)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Hari tercatat = Terisi + Nol dari hari yang sudah berjalan. Rata-rata gula dihitung dari
          hari tercatat saja; hari Belum diisi tidak ikut.
        </p>
      </section>
      <Disclaimer />
    </article>
  );
}
