import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { staffForPage } from "@/server/auth/page-guards";
import { AppError } from "@/server/http/errors";
import { getBeverageType } from "@/server/modules/beverages/service";
import { BeverageTypeForm } from "../BeverageTypeForm";

export const metadata: Metadata = { title: "Edit Jenis Minuman" };

export default async function EditBeverageTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await staffForPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const b = await getBeverageType(id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });

  return (
    <>
      <p className="small">
        <Link href="/admin/referensi-minuman">← Referensi Minuman</Link>
      </p>
      <h1>Edit {b.name}</h1>
      <p className="muted">Perubahan hanya berlaku untuk catatan baru.</p>
      <BeverageTypeForm defaults={b} />
    </>
  );
}
