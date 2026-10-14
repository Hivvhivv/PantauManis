import { requireSuperadmin } from "@/server/auth/guards";
import { idParam, json, route } from "@/server/http/route";
import { acknowledgeAlert } from "@/server/modules/security-alerts";

export const POST = route<{ id: string }>(async (req, ctx) => {
  const { actor } = await requireSuperadmin(req);
  await acknowledgeAlert(await idParam(ctx), actor);
  return json({ ok: true });
});
