import type { Metadata } from "next";
import { Disclaimer } from "@/components/Disclaimer";
import { LogoutButton } from "@/components/LogoutButton";
import { respondentForPage } from "@/server/auth/page-guards";

export const metadata: Metadata = { title: "Selamat Datang" };

/**
 * Tujuan Responden setelah login. Persetujuan dan pretest dibuat di Fase 2;
 * untuk sementara halaman ini hanya menyambut Responden.
 */
export default async function MulaiPage() {
  const r = await respondentForPage();
  return (
    <main className="narrow stack">
      <div className="row spread">
        <p className="brand">PantauManis</p>
        <LogoutButton kind="respondent" />
      </div>
      <h1>Selamat datang, {r.label}</h1>
      <div className="card stack">
        <p>Terima kasih telah bergabung dalam penelitian ini.</p>
        <p className="muted">
          Lembar persetujuan dan kuesioner awal akan segera tersedia di halaman ini. Silakan kembali
          lagi nanti.
        </p>
      </div>
      <Disclaimer />
    </main>
  );
}
