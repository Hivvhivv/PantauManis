import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RespondentShell } from "@/components/RespondentShell";
import { respondentAtStage } from "@/server/auth/page-guards";
import { AppError } from "@/server/http/errors";
import { logFormData } from "@/server/modules/consumption/form-data";
import { getOwnLog } from "@/server/modules/consumption/service";
import { toLocalDateTime } from "@/server/modules/study/days";
import { LogForm } from "../LogForm";

export const metadata: Metadata = { title: "Ubah Catatan" };

export default async function EditLogPage({ params }: { params: Promise<{ id: string }> }) {
  const r = await respondentAtStage("ready");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  // Hanya catatan milik responden yang login (BR-09); milik orang lain → 404.
  const log = await getOwnLog(r, id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  const { nowLocal: _now, today: _today, ...data } = await logFormData(r);
  void _now;
  void _today;

  return (
    <RespondentShell>
      <p className="small" style={{ margin: 0 }}>
        <Link href="/riwayat">← Riwayat</Link>
      </p>
      <h1 style={{ margin: 0 }}>Ubah Catatan</h1>
      <LogForm
        {...data}
        initial={{
          id: log.id,
          beverageTypeId: log.beverageTypeId,
          volumeMl: log.volumeMl,
          servings: log.servings,
          sugarLevel: log.sugarLevel,
          consumedAt: toLocalDateTime(log.consumedAt),
          note: log.note ?? "",
        }}
      />
    </RespondentShell>
  );
}
