import type { Metadata } from "next";
import { Disclaimer } from "@/components/Disclaimer";
import { LogoutButton } from "@/components/LogoutButton";
import { Logo } from "@/components/Logo";
import { respondentForPage } from "@/server/auth/page-guards";

export const metadata: Metadata = { title: "Selamat Datang" };

const STEPS = [
  { title: "Lembar persetujuan", desc: "Baca informasi penelitian dan beri persetujuanmu." },
  { title: "Kuesioner awal", desc: "Beberapa pertanyaan singkat sebelum mulai mencatat." },
  { title: "Catat minuman 14 hari", desc: "Kurang dari 1 menit per catatan." },
  { title: "Kuesioner akhir", desc: "Terbuka di akhir periode penelitian." },
];

/**
 * Tujuan Responden setelah login. Persetujuan dan pretest dibuat di Fase 2;
 * untuk sementara halaman ini menyambut Responden dan menjelaskan langkahnya.
 */
export default async function MulaiPage() {
  const r = await respondentForPage();
  return (
    <>
      <header className="resp-header">
        <div className="inner">
          <Logo />
          <LogoutButton kind="respondent" />
        </div>
      </header>
      <main className="resp-main stack">
        <section className="hero-card stack">
          <h1>
            Selamat datang, {r.label}! <span aria-hidden="true">👋</span>
          </h1>
          <p style={{ margin: 0 }}>
            Terima kasih sudah bergabung. Setiap catatan kecilmu membantu penelitian ini.
          </p>
        </section>

        <section className="card stack">
          <h2 style={{ margin: 0 }}>Langkah penelitianmu</h2>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="step-num" aria-hidden="true">
                  {i + 1}
                </span>
                <span>
                  <span className="step-title">{s.title}</span>
                  <br />
                  <span className="small muted">{s.desc}</span>
                </span>
                <span className="pill">Segera dibuka</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="tip-card">
          <span className="icon" aria-hidden="true">
            💡
          </span>
          <p style={{ margin: 0 }}>
            Kamu akan tetap masuk di perangkat ini selama 30 hari. Simpan kode aksesmu di tempat
            aman dan jangan bagikan ke orang lain.
          </p>
        </section>

        <Disclaimer />
      </main>
    </>
  );
}
