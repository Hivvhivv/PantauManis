import { z } from "zod";
import { requireStaff } from "@/server/auth/guards";
import { notFound, validationError } from "@/server/http/errors";
import { route } from "@/server/http/route";
import {
  auditExport,
  buildTables,
  DATASETS,
  tablesToXlsx,
  tableToCsv,
  type DatasetName,
} from "@/server/modules/export/service";

const formatSchema = z.object({ format: z.enum(["csv", "xlsx"]).catch("csv") });

/**
 * Ekspor data penelitian (FR-A-07): /api/admin/export/<dataset>?format=csv|xlsx,
 * atau /api/admin/export/semua (XLSX berisi semua dataset + Codebook). Dicatat di audit log.
 */
export const GET = route<{ dataset: string }>(async (req, ctx) => {
  const { actor } = await requireStaff(req);
  const { dataset } = await ctx.params;
  const { format } = formatSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const all = dataset === "semua";
  if (!all && !(DATASETS as readonly string[]).includes(dataset))
    throw notFound("Dataset tidak dikenal.");
  if (all && format === "csv")
    throw validationError({ format: "Unduh semua dataset tersedia sebagai XLSX." });

  const names: readonly DatasetName[] = all ? DATASETS : [dataset as DatasetName];
  const tables = await buildTables(names);
  const rows = tables.reduce((s, t) => s + t.rows.length, 0);
  await auditExport(actor, { dataset, format, rows });

  const date = new Date().toISOString().slice(0, 10);
  const base = `pantaumanis-${dataset}-${date}`;
  if (format === "csv") {
    return new Response(tableToCsv(tables[0]!), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }
  return new Response(new Uint8Array(await tablesToXlsx(tables)), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${base}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
});
