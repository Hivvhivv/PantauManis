import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { superadminForPage } from "@/server/auth/page-guards";
import { AppError } from "@/server/http/errors";
import { getStaff } from "@/server/modules/staff-users/service";
import { formatDateTime } from "@/lib/format";
import { EditStaffForm } from "./EditStaffForm";

export const metadata: Metadata = { title: "Kelola Pengguna" };

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await superadminForPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const staff = await getStaff(id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });

  return (
    <>
      <p className="small">
        <Link href="/admin/pengguna">← Manajemen Pengguna</Link>
      </p>
      <h1>{staff.name}</h1>
      <p className="muted small">Login terakhir: {formatDateTime(staff.lastLoginAt)}</p>
      <EditStaffForm staff={staff} isSelf={me.id === staff.id} />
    </>
  );
}
