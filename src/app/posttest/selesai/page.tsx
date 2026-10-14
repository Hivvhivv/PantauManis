import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Disclaimer } from "@/components/Disclaimer";
import { DrinksIllustration } from "@/components/DrinksIllustration";
import { RespondentShell } from "@/components/RespondentShell";
import { respondentAtStage } from "@/server/auth/page-guards";
import { getDashboard } from "@/server/modules/consumption/dashboard";
import { posttestInfo } from "@/server/modules/questionnaires/service";

export const metadata: Metadata = { title: "Terima Kasih" };

/** Halaman terima kasih + ringkasan progres setelah posttest (FR-R-07). */
export default async function PosttestDonePage() {
  const r = await respondentAtStage("ready");
  const info = await posttestInfo(r);
  if (info.state !== "submitted") redirect("/posttest");
  const d = await getDashboard(r, "2w");

  return (
    <RespondentShell wide label={r.label}>
      <section className="dash-hero page-hero">
        <div className="stack">
          <p className="eyebrow">Penelitian selesai</p>
          <h1>Terima kasih, {r.label}! 🎉</h1>
          <p className="lead-text" style={{ margin: 0 }}>
            Kamu sudah menyelesaikan kuesioner akhir. Setiap catatanmu sangat berarti untuk
            penelitian ini.
          </p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <DrinksIllustration />
        </div>
      </section>

      <section className="card stack" aria-labelledby="sum-h">
        <h2 id="sum-h" style={{ margin: 0 }}>
          Ringkasan {d.durationDays} hari penelitianmu
        </h2>
        <div className="summary-grid">
          <div className="stat">
            <div className="small muted">Hari tercatat</div>
            <div className="value">
              {d.completeness.filled}
              <small>/{d.completeness.elapsed} hari</small>
            </div>
          </div>
          <div className="stat">
            <div className="small muted">Hari tanpa minuman manis (Nol)</div>
            <div className="value">
              {d.summary.zeroDays} <small>hari</small>
            </div>
          </div>
          <div className="stat">
            <div className="small muted">Rata-rata perkiraan gula per hari tercatat</div>
            <div className="value">
              ±{d.summary.avgSugarPerRecordedDay} <small>g</small>
            </div>
          </div>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Kamu tetap bisa mencatat minuman dan melihat grafikmu kapan saja.
        </p>
        <Link className="btn btn-primary" href="/beranda">
          Ke Beranda
        </Link>
      </section>
      <Disclaimer />
    </RespondentShell>
  );
}
