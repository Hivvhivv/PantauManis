import { requireSuperadmin } from "@/server/auth/guards";
import { idParam, json, route } from "@/server/http/route";
import { resetStaffPassword } from "@/server/modules/staff-users/service";

export const POST = route<{ id: string }>(async (req, ctx) => {
  const { actor } = await requireSuperadmin(req);
  return json({ temporaryPassword: await resetStaffPassword(await idParam(ctx), actor) });
});
