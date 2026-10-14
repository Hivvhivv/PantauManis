import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/Pagination";
import { superadminForPage } from "@/server/auth/page-guards";
import { userListQuerySchema } from "@/server/modules/staff-users/schemas";
import { listUsers } from "@/server/modules/staff-users/service";
import { formatDateTime, ROLE_LABELS } from "@/lib/format";

export const metadata: Metadata = { title: "Manajemen Pengguna" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function UsersPage({ searchParams }: { searchParams: SP }) {
  await superadminForPage();
  const raw = Object.fromEntries(
    Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const query = userListQuerySchema.parse(raw);
  const data = await listUsers(query);

  return (
    <>
      <div className="row spread">
        <h1 style={{ margin: 0 }}>Manajemen Pengguna</h1>
        <Link className="btn btn-primary" href="/admin/pengguna/tambah">
          Tambah Pengguna
        </Link>
      </div>

      <form className="filters card" method="get" role="search">
        <div>
          <label htmlFor="q">Cari nama, email, atau ID Responden</label>
          <input id="q" name="q" defaultValue={query.q ?? ""} />
        </div>
        <div>
          <label htmlFor="role">Peran</label>
          <select id="role" name="role" defaultValue={query.role}>
            <option value="all">Semua</option>
            <option value="superadmin">Superadmin</option>
            <option value="admin">Admin</option>
            <option value="respondent">Responden</option>
          </select>
        </div>
        <div>
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={query.status}>
            <option value="all">Semua</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
        <button className="btn" type="submit">
          Terapkan
        </button>
      </form>

      <p className="small muted">{data.total} pengguna</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Nama / ID Responden</th>
              <th scope="col">Email / Kode</th>
              <th scope="col">Peran</th>
              <th scope="col">Status</th>
              <th scope="col">Terakhir aktif</th>
              <th scope="col">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Tidak ada pengguna yang cocok.
                </td>
              </tr>
            )}
            {data.items.map((u) => (
              <tr key={`${u.kind}-${u.id}`}>
                <td>{u.name}</td>
                <td className={u.kind === "respondent" ? "mono" : undefined}>{u.secondary}</td>
                <td>{ROLE_LABELS[u.role]}</td>
                <td>
                  <span className={`badge ${u.isActive ? "badge-active" : "badge-inactive"}`}>
                    {u.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="small">{formatDateTime(u.lastActiveAt)}</td>
                <td>
                  <Link
                    className="btn btn-sm"
                    href={
                      u.kind === "staff"
                        ? `/admin/pengguna/staf/${u.id}`
                        : `/admin/responden/${u.id}`
                    }
                  >
                    Kelola
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={data.page}
        pageCount={data.pageCount}
        basePath="/admin/pengguna"
        params={{ q: query.q, role: query.role, status: query.status }}
      />
    </>
  );
}
