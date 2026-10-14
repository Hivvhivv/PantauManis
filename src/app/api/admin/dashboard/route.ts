import { requireStaff } from "@/server/auth/guards";
import { json, route } from "@/server/http/route";
import { dashboardQuerySchema, getAdminDashboard } from "@/server/modules/admin-dashboard/service";

export const GET = route(async (req) => {
  await requireStaff(req);
  const query = dashboardQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  return json(await getAdminDashboard(query));
});
