import type { Metadata } from "next";
import Link from "next/link";
import { CompositionChart, DrinksBarChart, SugarLineChart } from "@/components/DashboardCharts";
import { formatDateTime } from "@/lib/format";
import { categoryColor } from "@/lib/palette";
import { staffForPage } from "@/server/auth/page-guards";
import { dashboardQuerySchema, getAdminDashboard } from "@/server/modules/admin-dashboard/service";

export const metadata: Metadata = { title: "Dashboard" };

type SP = Promise<Record<string, string | string[] | undefined>>;

/** Dashboard Admin agregat (FR-A-01): data gabungan, tanpa identitas per orang. */
export default async function AdminDashboard({ searchParams }: { searchParams: SP }) {
  await staffForPage();
  const raw = Object.fromEntries(
    Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const query = dashboardQuerySchema.parse(raw);
  const d = await getAdminDashboard(query);

  const labels = d.perDay.map((x) => `H${x.studyDay}`);
  // Hari tanpa responden yang mencatat → celah, bukan 0.
  const sugar = d.perDay.map((x) => (x.n ? x.avgSugarG : null));
  const drinks = d.perDay.map((x) => (x.n ? x.avgDrinks : null));
  const compTotal = d.composition.reduce((s, c) => s + c.servings, 0);
  const funnelMax = Math.max(1, d.funnel[0]?.value ?? 1);

  return (
    <>
      <div className="row spread">
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <Link className="btn" href="/admin/responden">
          List Responden
        </Link>
      </div>

      <form className="filters card" method="get" role="search">
        <div>
          <label htmlFor="from">Pretest dari</label>
          <input id="from" name="from" type="date" defaultValue={query.from ?? ""} />
        </div>
        <div>
          <label htmlFor="to">Sampai</label>
          <input id="to" name="to" type="date" defaultValue={query.to ?? ""} />
        </div>
        <div>
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={query.status}>
            <option value="all">Semua</option>
            <option value="not_started">Belum mulai</option>
            <option value="active">Aktif</option>
            <option value="done">Selesai</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
        <button className="btn" type="submit">
          Terapkan
        </button>
      </form>

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
          <div className="value">
            {d.avgCompleteness === null ? "—" : d.avgCompleteness}
            <small>{d.avgCompleteness === null ? "" : "%"}</small>
          </div>
        </div>
        <div className="stat">
          <div className="small muted">Pretest / posttest selesai</div>
          <div className="value">
            {d.pretestPct}% <small>/ {d.posttestPct}%</small>
          </div>
        </div>
      </section>

      <div className="dash-grid two-one">
        <section className="card stack" aria-labelledby="perday-h">
          <h2 id="perday-h" style={{ margin: 0 }}>
            Rata-rata per hari penelitian
          </h2>
          <p className="small muted" style={{ margin: 0 }}>
            Dari responden yang mencatat (Terisi atau Nol) di hari tersebut. Hari Belum diisi tidak
            ikut dirata-rata.
          </p>
          <h3 className="chart-title">
            Perkiraan gula <span className="muted">(gram)</span>
          </h3>
          <SugarLineChart labels={labels} values={sugar} />
          <h3 className="chart-title">Jumlah minuman</h3>
          <DrinksBarChart labels={labels} values={drinks} />
          <details>
            <summary className="small">Tabel per hari (n responden)</summary>
            <div className="table-wrap" style={{ marginTop: "0.5rem" }}>
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
          </details>
        </section>

        <section className="card stack" aria-labelledby="comp-h">
          <h2 id="comp-h" style={{ margin: 0 }}>
            Jenis minuman
          </h2>
          {d.composition.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Belum ada catatan minuman.
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

      <div className="dash-grid one-one">
        <section className="card stack" aria-labelledby="funnel-h">
          <h2 id="funnel-h" style={{ margin: 0 }}>
            Corong penyelesaian
          </h2>
          <ol className="funnel">
            {d.funnel.map((f) => (
              <li key={f.label}>
                <div className="row spread small">
                  <span>{f.label}</span>
                  <strong>{f.value}</strong>
                </div>
                <div className="bar" aria-hidden="true">
                  <span style={{ width: `${(f.value / funnelMax) * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="card stack" aria-labelledby="attn-h">
          <h2 id="attn-h" style={{ margin: 0 }}>
            Perlu perhatian
          </h2>
          {d.attention.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Tidak ada responden yang perlu ditindaklanjuti saat ini.
            </p>
          ) : (
            <ul className="recent-list">
              {d.attention.map((a) => (
                <li key={a.id} style={{ gridTemplateColumns: "1fr auto" }}>
                  <span>
                    <strong>{a.label}</strong>{" "}
                    <span className="small muted">· Hari ke-{a.studyDay}</span>
                    <br />
                    <span className="small">{a.reasons.join(" · ")}</span>
                    <br />
                    <span className="small muted">
                      Terakhir aktif: {formatDateTime(a.lastActiveAt)}
                    </span>
                  </span>
                  <Link className="btn btn-sm" href={`/admin/responden/${a.id}`}>
                    Detail
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
