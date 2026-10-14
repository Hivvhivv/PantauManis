import { requireReadyRespondent } from "@/server/auth/guards";
import { json, parseJson, route } from "@/server/http/route";
import { logInputSchema } from "@/server/modules/consumption/schemas";
import { createLog } from "@/server/modules/consumption/service";

export const POST = route(async (req) => {
  const r = await requireReadyRespondent(req);
  return json(await createLog(r, await parseJson(req, logInputSchema)), { status: 201 });
});
