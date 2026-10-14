import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { staffForPage } from "@/server/auth/page-guards";
import { AppError } from "@/server/http/errors";
import { getMaterialAdmin } from "@/server/modules/education/service";
import { MaterialForm } from "../MaterialForm";

export const metadata: Metadata = { title: "Edit Materi" };

export default async function EditMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  await staffForPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const m = await getMaterialAdmin(id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  return (
    <>
      <p className="small" style={{ margin: 0 }}>
        <Link href="/admin/edukasi">← Materi Edukasi</Link>
      </p>
      <h1 style={{ margin: 0 }}>Edit: {m.title}</h1>
      <MaterialForm
        defaults={{
          id: m.id,
          title: m.title,
          summary: m.summary,
          body: m.body,
          icon: m.icon,
          imageKey: m.imageKey,
          imageUrl: m.imageUrl,
          imageAlt: m.imageAlt,
          videoUrl: m.videoUrl,
          source: m.source,
          unlockDay: m.unlockDay,
          status: m.status,
          questions: m.questions,
        }}
      />
    </>
  );
}
