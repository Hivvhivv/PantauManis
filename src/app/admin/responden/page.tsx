import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/Pagination";
import { staffForPage } from "@/server/auth/page-guards";
import { listQuerySchema } from "@/server/modules/respondents/schemas";
import { listRespondents } from "@/server/modules/respondents/service";
import { formatDateTime, studyDayLabel } from "@/lib/format";
import { CodeReveal } from "./CodeReveal";
import { RespondentActions } from "./RespondentActions";

export const metadata: Metadata = { title: "List Responden" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function RespondentListPage({ searchParams }: { searchParams: SP }) {
  const user = await staffForPage();
  const raw = Object.fromEntries(
    Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const query = listQuerySchema.parse(raw);
  const data = await listRespondents(query);

  return (
    <>
      <div className="row spread">
        <h1 style={{ margin: 0 }}>List Responden</h1>
        <div className="row">
          <Link className="btn btn-primary" href="/admin/responden/tambah">
            Tambah Responden
          </Link>
          <Link className="btn" href="/admin/responden/massal">
            Buat Kode Massal
          </Link>
          <Link className="btn" href="/admin/responden/impor">
            Impor CSV
          </Link>
          <a className="btn" href="/api/admin/respondents/codes.csv">
            Unduh daftar kode
          </a>
          <Link className="btn" href="/admin/responden/cetak">
            Cetak semua kartu
          </Link>
        </div>
      </div>

      <form className="filters card" method="get" role="search">
        <div>
          <label htmlFor="q">Cari ID/inisial</label>
          <input id="q" name="q" defaultValue={query.q ?? ""} placeholder="mis. R001" />
        </div>
        <div>
          <label htmlFor="status">Status akses</label>
          <select id="status" name="status" defaultValue={query.status}>
            <option value="all">Semua</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
        <div>
          <label htmlFor="progress">Progres</label>
          <select id="progress" name="progress" defaultValue={query.progress}>
            <option value="all">Semua</option>
            <option value="no_pretest">Belum pretest</option>
            <option value="low_completeness">Kelengkapan &lt; 50%</option>
          </select>
        </div>
        <div>
          <label htmlFor="sort">Urutkan</label>
          <select id="sort" name="sort" defaultValue={query.sort}>
            <option value="label">ID Responden</option>
            <option value="created">Terbaru dibuat</option>
            <option value="last_active">Terakhir aktif</option>
          </select>
        </div>
        <button className="btn" type="submit">
          Terapkan
        </button>
      </form>

      <p className="small muted">{data.total} responden</p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">ID Responden</th>
              <th scope="col">Kode Akses</th>
              <th scope="col">Status Akses</th>
              <th scope="col">Hari ke-</th>
              <th scope="col">Kelengkapan</th>
              <th scope="col">Pretest / Posttest</th>
              <th scope="col">Terakhir aktif</th>
              <th scope="col">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && (
              <tr>
                <td colSpan={8} className="muted">
                  Belum ada responden yang cocok.
                </td>
              </tr>
            )}
            {data.items.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/admin/responden/${r.id}`}>{r.label}</Link>
                  {r.initials && <div className="small muted">{r.initials}</div>}
                </td>
                <td>
                  <CodeReveal id={r.id} maskedCode={r.maskedCode} />
                </td>
                <td>
                  <span
                    className={`badge ${r.accessStatus === "active" ? "badge-active" : "badge-inactive"}`}
                  >
                    {r.accessStatus === "active" ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td>{studyDayLabel(r.progress)}</td>
                <td>
                  {r.progress.completeness
                    ? `${r.progress.completeness.filled}/${r.progress.completeness.elapsed}`
                    : "—"}
                </td>
                <td>{r.progress.pretestDone ? "Selesai" : "Belum"} / Belum</td>
                <td className="small">{formatDateTime(r.lastActiveAt)}</td>
                <td>
                  <RespondentActions
                    id={r.id}
                    label={r.label}
                    accessStatus={r.accessStatus}
                    canDelete={user.role === "superadmin"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={data.page}
        pageCount={data.pageCount}
        basePath="/admin/responden"
        params={{ q: query.q, status: query.status, sort: query.sort, progress: query.progress }}
      />
    </>
  );
}
