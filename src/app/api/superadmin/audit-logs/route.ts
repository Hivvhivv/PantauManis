import { requireSuperadmin } from "@/server/auth/guards";
import { json, route } from "@/server/http/route";
import { auditQuerySchema, listAuditLogs } from "@/server/modules/audit-viewer";

/** Log audit hanya-baca (FR-S-03). Tidak ada endpoint ubah/hapus. */
export const GET = route(async (req) => {
  await requireSuperadmin(req);
  return json(
    await listAuditLogs(auditQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))),
  );
});
