import { requireSuperadmin } from "@/server/auth/guards";
import { idParam, json, parseJson, route } from "@/server/http/route";
import { updateStaffSchema } from "@/server/modules/staff-users/schemas";
import { getStaff, softDeleteStaff, updateStaff } from "@/server/modules/staff-users/service";

type P = { id: string };

export const GET = route<P>(async (req, ctx) => {
  await requireSuperadmin(req);
  return json(await getStaff(await idParam(ctx)));
});

export const PATCH = route<P>(async (req, ctx) => {
  const { actor } = await requireSuperadmin(req);
  const id = await idParam(ctx);
  await updateStaff(id, await parseJson(req, updateStaffSchema), actor);
  return json({ ok: true });
});

export const DELETE = route<P>(async (req, ctx) => {
  const { actor } = await requireSuperadmin(req);
  await softDeleteStaff(await idParam(ctx), actor);
  return json({ ok: true });
});
