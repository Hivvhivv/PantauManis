import { requireReadyRespondent } from "@/server/auth/guards";
import { json, route } from "@/server/http/route";
import { getHistory } from "@/server/modules/consumption/dashboard";
import { historyQuerySchema } from "@/server/modules/consumption/schemas";

export const GET = route(async (req) => {
  const r = await requireReadyRespondent(req);
  return json(
    await getHistory(r, historyQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))),
  );
});
