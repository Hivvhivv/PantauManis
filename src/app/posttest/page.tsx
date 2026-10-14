import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RespondentShell } from "@/components/RespondentShell";
import { formatLocalDate } from "@/lib/format";
import { respondentAtStage } from "@/server/auth/page-guards";
import {
  getQuestionnaireForRespondent,
  posttestInfo,
} from "@/server/modules/questionnaires/service";
import { QuestionnaireForm } from "../pretest/QuestionnaireForm";

export const metadata: Metadata = { title: "Kuesioner Akhir" };

/** Posttest (FR-R-07): hanya bisa diisi saat jendelanya terbuka. */
export default async function PosttestPage() {
  const r = await respondentAtStage("ready");
  const info = await posttestInfo(r);
  if (info.state === "submitted") redirect("/posttest/selesai");

  if (info.state !== "open") {
    return (
      <RespondentShell wide label={r.label}>
        <section className="hero-card stack">
          <h1>Kuesioner Akhir</h1>
          <p style={{ margin: 0 }}>
            {info.state === "not_yet"
              ? `Kuesioner akhir akan terbuka pada ${formatLocalDate(info.opens!)}. Sampai saat itu, terus catat minumanmu ya!`
              : "Masa pengisian kuesioner akhir sudah berakhir. Terima kasih sudah mengikuti penelitian ini."}
          </p>
          <Link className="btn btn-primary" href="/beranda">
            Kembali ke Beranda
          </Link>
        </section>
      </RespondentShell>
    );
  }

  const q = await getQuestionnaireForRespondent(r.id, "posttest");
  return (
    <RespondentShell wide label={r.label}>
      <section className="hero-card stack">
        <p className="eyebrow">Hampir selesai!</p>
        <h1>{q.title}</h1>
        {q.intro && <p style={{ margin: 0 }}>{q.intro}</p>}
        <p className="small" style={{ margin: 0 }}>
          Bisa diisi sampai <strong>{formatLocalDate(info.closes!)}</strong>. Jawabanmu tersimpan
          otomatis; setelah dikirim tidak bisa diubah.
        </p>
      </section>
      <QuestionnaireForm
        endpoint="/api/respondent/posttest"
        questions={q.questions}
        initialAnswers={q.answers}
      />
    </RespondentShell>
  );
}
