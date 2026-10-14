import { requireStaff } from "@/server/auth/guards";
import { idParam, json, parseJson, route } from "@/server/http/route";
import { statusSchema } from "@/server/modules/respondents/schemas";
import { setAccessStatus } from "@/server/modules/respondents/service";

export const POST = route<{ id: string }>(async (req, ctx) => {
  const { actor } = await requireStaff(req);
  const { status } = await parseJson(req, statusSchema);
  await setAccessStatus(await idParam(ctx), status, actor);
  return json({ ok: true });
});
