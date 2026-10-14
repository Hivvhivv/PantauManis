import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/server/db";
import { staffForPage } from "@/server/auth/page-guards";

export const metadata: Metadata = { title: "Dashboard" };

/** Dashboard agregat lengkap dibuat di Fase 3. Untuk sementara hanya ringkasan jumlah responden. */
export default async function AdminDashboard() {
  await staffForPage();
  const [total, active] = await Promise.all([
    prisma.respondent.count({ where: { deletedAt: null } }),
    prisma.respondent.count({ where: { deletedAt: null, accessStatus: "active" } }),
  ]);

  return (
    <>
      <h1>Dashboard</h1>
      <div className="grid-2">
        <div className="card">
          <p className="muted small">Total responden</p>
          <p style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>{total}</p>
        </div>
        <div className="card">
          <p className="muted small">Akses aktif</p>
          <p style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>{active}</p>
        </div>
      </div>
      <p className="muted">
        Grafik dan ringkasan pencatatan akan tampil di sini setelah responden mulai mencatat.
      </p>
      <Link className="btn btn-primary" href="/admin/responden">
        Buka List Responden
      </Link>
    </>
  );
}
