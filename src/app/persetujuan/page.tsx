import type { Metadata } from "next";
import { Disclaimer } from "@/components/Disclaimer";
import { RespondentShell } from "@/components/RespondentShell";
import { StudySteps } from "@/components/StudySteps";
import { respondentAtStage } from "@/server/auth/page-guards";
import { getStudySettings } from "@/server/modules/study/settings";
import { ConsentForm } from "./ConsentForm";

export const metadata: Metadata = { title: "Persetujuan" };

/** Lembar informasi dan persetujuan (FR-R-01). */
export default async function ConsentPage() {
  const r = await respondentAtStage("consent");
  const { consentText } = await getStudySettings();

  return (
    <RespondentShell nav={false}>
      <StudySteps current={0} />
      <section className="hero-card stack">
        <h1>
          Halo, {r.label}! <span aria-hidden="true">👋</span>
        </h1>
        <p style={{ margin: 0 }}>Sebelum mulai, baca dulu informasi penelitian berikut ya.</p>
      </section>
      <section className="card stack">
        <h2 style={{ margin: 0 }}>Informasi penelitian</h2>
        <div style={{ whiteSpace: "pre-wrap" }}>{consentText}</div>
      </section>
      <ConsentForm />
      <Disclaimer />
    </RespondentShell>
  );
}
