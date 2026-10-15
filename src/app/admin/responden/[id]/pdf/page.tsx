import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportDocument } from "@/components/report/ReportDocument";
import { parseSections, RESPONDENT_SECTIONS } from "@/lib/pdf-sections";
import { pageActor, staffForPage } from "@/server/auth/page-guards";
import { AppError } from "@/server/http/errors";
import { respondentPdf } from "@/server/modules/export/report";

export const metadata: Metadata = { title: "PDF Hasil Responden" };

/** PDF satu responden dari Detail Responden (ADR-009). Dicatat di log audit sebagai ekspor. */
export default async function RespondentPdfPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ b?: string | string[] }>;
}) {
  const user = await staffForPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sections = parseSections((await searchParams).b, RESPONDENT_SECTIONS);
  const person = await respondentPdf(id, sections, await pageActor(user)).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });

  return (
    <ReportDocument
      title={`Laporan Hasil Responden ${person.label}`}
      staffName={user.name}
      sections={sections}
      people={[person]}
    />
  );
}
