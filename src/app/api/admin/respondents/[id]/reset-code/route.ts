import { requireStaff } from "@/server/auth/guards";
import { idParam, json, route } from "@/server/http/route";
import { resetCode } from "@/server/modules/respondents/service";

export const POST = route<{ id: string }>(async (req, ctx) => {
  const { actor } = await requireStaff(req);
  return json(await resetCode(await idParam(ctx), actor));
});
