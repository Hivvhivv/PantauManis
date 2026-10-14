import type { Metadata } from "next";
import { Pagination } from "@/components/Pagination";
import { formatDateTime } from "@/lib/format";
import { superadminForPage } from "@/server/auth/page-guards";
import { actionLabel } from "@/server/modules/audit";
import {
  auditQuerySchema,
  KNOWN_ACTIONS,
  listAuditLogs,
  staffOptions,
} from "@/server/modules/audit-viewer";

export const metadata: Metadata = { title: "Log Audit" };

type SP = Promise<Record<string, string | string[] | undefined>>;

const meta = (m: unknown) => {
  if (!m || typeof m !== "object") return "";
  return Object.entries(m as Record<string, unknown>)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join(" · ");
};

/** Log audit hanya-baca (FR-S-03), khusus Superadmin. */
export default async function AuditLogPage({ searchParams }: { searchParams: SP }) {
  await superadminForPage();
  const raw = Object.fromEntries(
    Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const q = auditQuerySchema.parse(raw);
  const [data, staff] = await Promise.all([listAuditLogs(q), staffOptions()]);

  return (
    <>
      <h1 style={{ margin: 0 }}>Log Audit</h1>
      <p className="muted" style={{ margin: 0 }}>
        Catatan aktivitas yang tidak bisa diubah atau dihapus dari aplikasi. Waktu dalam WIB.
      </p>

      <form className="filters card" method="get" role="search">
        <div>
          <label htmlFor="action">Aksi</label>
          <select id="action" name="action" defaultValue={q.action ?? ""}>
            <option value="">Semua aksi</option>
            {KNOWN_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {actionLabel(a) === a ? a : `${actionLabel(a)} (${a})`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="actor">Pelaku (staf)</label>
          <select id="actor" name="actor" defaultValue={q.actor ?? ""}>
            <option value="">Semua</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="from">Dari</label>
          <input id="from" name="from" type="date" defaultValue={q.from ?? ""} />
        </div>
        <div>
          <label htmlFor="to">Sampai</label>
          <input id="to" name="to" type="date" defaultValue={q.to ?? ""} />
        </div>
        <button className="btn" type="submit">
          Terapkan
        </button>
      </form>

      <p className="small muted" style={{ margin: 0 }}>
        {data.total} entri
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Waktu</th>
              <th scope="col">Pelaku</th>
              <th scope="col">Aksi</th>
              <th scope="col">Target</th>
              <th scope="col">Detail</th>
              <th scope="col">IP</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Tidak ada entri yang cocok.
                </td>
              </tr>
            )}
            {data.items.map((l) => (
              <tr key={l.id}>
                <td className="small" style={{ whiteSpace: "nowrap" }}>
                  {formatDateTime(l.createdAt)}
                </td>
                <td>{l.actor}</td>
                <td>
                  {l.actionLabel}
                  {l.actionLabel !== l.action && <div className="small muted mono">{l.action}</div>}
                </td>
                <td>{l.target}</td>
                <td className="small">{meta(l.metadata)}</td>
                <td className="small mono">{l.ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={data.page}
        pageCount={data.pageCount}
        basePath="/admin/log-audit"
        params={{ action: q.action, actor: q.actor, from: q.from, to: q.to }}
      />
    </>
  );
}
