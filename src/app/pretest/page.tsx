import type { Metadata } from "next";
import Link from "next/link";
import { RespondentShell } from "@/components/RespondentShell";
import { StudySteps } from "@/components/StudySteps";
import { respondentAtStage } from "@/server/auth/page-guards";
import { getQuestionnaireForRespondent } from "@/server/modules/questionnaires/service";
import { QuestionnaireForm } from "./QuestionnaireForm";

export const metadata: Metadata = { title: "Kuesioner Awal" };

/** Pretest (FR-R-01): dibuka dari tombol di Beranda; wajib sebelum fitur lain terbuka. */
export default async function PretestPage() {
  const r = await respondentAtStage("pretest");
  const q = await getQuestionnaireForRespondent(r.id, "pretest");

  return (
    <RespondentShell nav={false} label={r.label}>
      <p className="small" style={{ margin: 0 }}>
        <Link href="/beranda">← Kembali ke Beranda</Link>
      </p>
      <StudySteps current={1} />
      <section className="hero-card stack">
        <h1>{q.title}</h1>
        {q.intro && <p style={{ margin: 0 }}>{q.intro}</p>}
        <p className="small" style={{ margin: 0 }}>
          Jawabanmu tersimpan otomatis, jadi kamu bisa melanjutkan nanti. Setelah dikirim, jawaban
          tidak bisa diubah.
        </p>
      </section>
      <QuestionnaireForm questions={q.questions} initialAnswers={q.answers} />
    </RespondentShell>
  );
}
