import { requireReadyRespondent } from "@/server/auth/guards";
import { json, route } from "@/server/http/route";
import { listMaterialsForRespondent } from "@/server/modules/education/service";

export const GET = route(async (req) => {
  const r = await requireReadyRespondent(req);
  return json({ items: await listMaterialsForRespondent(r) });
});
