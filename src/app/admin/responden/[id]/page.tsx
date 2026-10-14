import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { staffForPage } from "@/server/auth/page-guards";
import { AppError } from "@/server/http/errors";
import { respondentHistory } from "@/server/modules/audit";
import { getRespondentDetail } from "@/server/modules/respondents/service";
import { formatDateTime, formatPlainDate } from "@/lib/format";
import { CodeReveal } from "../CodeReveal";
import { RespondentActions } from "../RespondentActions";

export const metadata: Metadata = { title: "Detail Responden" };

async function load(id: string) {
  try {
    return await getRespondentDetail(id);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }
}

/** Detail ringkas (FR-A-03). Data hasil tidak dimuat di sini (AC-04). */
export default async function RespondentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await staffForPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const r = await load(id);
  const history = await respondentHistory(id);

  return (
    <>
      <p className="small">
        <Link href="/admin/responden">← List Responden</Link>
      </p>
      <div className="row spread">
        <h1 style={{ margin: 0 }}>Responden {r.label}</h1>
        <Link className="btn" href={`/admin/responden/${r.id}/ubah`}>
          Edit
        </Link>
      </div>

      <div className="grid-2">
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Identitas penelitian</h2>
          <dl className="meta">
            <dt>ID Responden</dt>
            <dd>{r.label}</dd>
            <dt>Inisial</dt>
            <dd>{r.initials ?? "—"}</dd>
            <dt>Kode akses</dt>
            <dd>
              <CodeReveal id={r.id} maskedCode={r.maskedCode} />
            </dd>
            <dt>Dibuat oleh</dt>
            <dd>{r.createdByName ?? "—"}</dd>
            <dt>Tanggal dibuat</dt>
            <dd>{formatDateTime(r.createdAt)}</dd>
          </dl>
        </section>
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Status</h2>
          <dl className="meta">
            <dt>Status akses</dt>
            <dd>
              <span
                className={`badge ${r.accessStatus === "active" ? "badge-active" : "badge-inactive"}`}
              >
                {r.accessStatus === "active" ? "Aktif" : "Nonaktif"}
              </span>
            </dd>
            <dt>Tanggal mulai</dt>
            <dd>{formatPlainDate(r.startDate)}</dd>
            <dt>Tanggal pretest</dt>
            <dd>Belum</dd>
            <dt>Hari ke-</dt>
            <dd>—</dd>
            <dt>Posttest</dt>
            <dd>Belum</dd>
            <dt>Terakhir aktif</dt>
            <dd>{formatDateTime(r.lastActiveAt)}</dd>
          </dl>
        </section>
      </div>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>Catatan admin</h2>
        <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>
          {r.notes || <span className="muted">Belum ada catatan.</span>}
        </p>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>Tindakan</h2>
        <RespondentActions
          id={r.id}
          label={r.label}
          accessStatus={r.accessStatus}
          canDelete={user.role === "superadmin"}
          showLinks={false}
        />
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Riwayat tindakan</h2>
        {history.length === 0 ? (
          <p className="muted">Belum ada riwayat.</p>
        ) : (
          <ul className="stack" style={{ paddingLeft: "1.25rem", margin: 0 }}>
            {history.map((h) => (
              <li key={h.id}>
                {h.label}{" "}
                <span className="muted small">
                  · {h.actorName} · {formatDateTime(h.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
