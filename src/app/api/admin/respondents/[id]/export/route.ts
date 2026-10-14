import { requireStaff } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { notFound } from "@/server/http/errors";
import { idParam, route } from "@/server/http/route";
import { auditExport, buildTables, DATASETS, tablesToXlsx } from "@/server/modules/export/service";

/** "Ekspor Data Responden Ini" (FR-A-04): XLSX semua dataset untuk satu responden. */
export const GET = route<{ id: string }>(async (req, ctx) => {
  const { actor } = await requireStaff(req);
  const id = await idParam(ctx);
  const r = await prisma.respondent.findFirst({
    where: { id, deletedAt: null },
    select: { label: true },
  });
  if (!r) throw notFound("Responden tidak ditemukan.");

  const tables = await buildTables(DATASETS, { respondentId: id });
  await auditExport(
    actor,
    {
      dataset: "responden_tunggal",
      format: "xlsx",
      rows: tables.reduce((s, t) => s + t.rows.length, 0),
    },
    id,
  );
  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(await tablesToXlsx(tables)), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="pantaumanis-${r.label}-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
});
