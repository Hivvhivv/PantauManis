import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { staffForPage } from "@/server/auth/page-guards";
import { AppError } from "@/server/http/errors";
import { getRespondentDetail } from "@/server/modules/respondents/service";
import { toDateInput } from "@/lib/format";
import { EditRespondentForm } from "./EditRespondentForm";

export const metadata: Metadata = { title: "Edit Responden" };

export default async function EditRespondentPage({ params }: { params: Promise<{ id: string }> }) {
  await staffForPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const r = await getRespondentDetail(id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });

  return (
    <>
      <p className="small">
        <Link href={`/admin/responden/${r.id}`}>← Detail {r.label}</Link>
      </p>
      <h1>Edit Responden {r.label}</h1>
      <EditRespondentForm
        id={r.id}
        defaults={{
          label: r.label,
          initials: r.initials,
          fullName: r.fullName,
          startDate: toDateInput(r.startDate),
          notes: r.notes,
        }}
      />
    </>
  );
}
