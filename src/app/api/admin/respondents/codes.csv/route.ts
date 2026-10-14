import { requireStaff } from "@/server/auth/guards";
import { route } from "@/server/http/route";
import { exportCodesCsv } from "@/server/modules/respondents/service";

export const GET = route(async (req) => {
  const { actor } = await requireStaff(req);
  const csv = await exportCodesCsv(actor);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kode-akses-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
