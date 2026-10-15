import type { Metadata } from "next";
import { ReportDocument } from "@/components/report/ReportDocument";
import { parseSections, PDF_SECTIONS, type PdfSection } from "@/lib/pdf-sections";
import { pageActor, staffForPage } from "@/server/auth/page-guards";
import { allRespondentsPdf } from "@/server/modules/export/report";

export const metadata: Metadata = { title: "PDF Semua Responden" };

const ALL = Object.keys(PDF_SECTIONS) as PdfSection[];

/** PDF semua responden dari List Responden (ADR-009). Dicatat di log audit sebagai ekspor. */
export default async function AllRespondentsPdfPage({
  searchParams,
}: {
  searchParams: Promise<{ b?: string | string[] }>;
}) {
  const user = await staffForPage();
  const sections = parseSections((await searchParams).b, ALL);
  const { people, overview } = await allRespondentsPdf(sections, await pageActor(user));

  return (
    <ReportDocument
      title="Laporan Hasil Semua Responden"
      staffName={user.name}
      sections={sections}
      people={people}
      overview={overview}
    />
  );
}
