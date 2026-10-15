import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Disclaimer } from "@/components/Disclaimer";
import { ReportToolbar } from "@/components/ReportToolbar";
import { formatDateTime } from "@/lib/format";
import { pageActor, staffForPage } from "@/server/auth/page-guards";
import { AppError } from "@/server/http/errors";
import { getRespondentReport } from "@/server/modules/respondents/results";
import { QuestionnaireComparison, StartedResults } from "../ResultsPanel";

export const metadata: Metadata = { title: "PDF Hasil Responden" };

/** PDF hasil satu responden (ADR-009). Setiap pembukaan dicatat di log audit sebagai ekspor. */
export default async function RespondentPdfPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await staffForPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getRespondentReport(id, await pageActor(user)).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });

  return (
    <article className="report stack">
      <ReportToolbar />
      <header>
        <h1 style={{ margin: 0 }}>Hasil Responden {data.label}</h1>
        <p style={{ margin: "0.25rem 0 0" }}>
          <strong>{data.fullName ?? "Nama belum diisi"}</strong>
        </p>
        <p className="small muted" style={{ margin: 0 }}>
          Dibuat {formatDateTime(new Date())} oleh {user.name}. Dokumen rahasia: berisi data pribadi
          peserta penelitian.
        </p>
      </header>
      {data.started ? (
        <StartedResults data={data} />
      ) : (
        <p className="muted">Responden belum menyelesaikan persetujuan dan kuesioner awal.</p>
      )}
      <QuestionnaireComparison pre={data.pretest} post={data.posttest} />
      <Disclaimer />
    </article>
  );
}
