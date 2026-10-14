import { requireStaff } from "@/server/auth/guards";
import { idParam, json, route } from "@/server/http/route";
import { revealCode } from "@/server/modules/respondents/service";

export const POST = route<{ id: string }>(async (req, ctx) => {
  const { actor } = await requireStaff(req);
  return json(await revealCode(await idParam(ctx), actor));
});
