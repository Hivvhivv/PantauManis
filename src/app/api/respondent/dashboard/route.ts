import { z } from "zod";
import { requireReadyRespondent } from "@/server/auth/guards";
import { json, route } from "@/server/http/route";
import { getDashboard } from "@/server/modules/consumption/dashboard";

const querySchema = z.object({ range: z.enum(["1w", "2w", "1m", "1y"]).catch("2w") });

export const GET = route(async (req) => {
  const r = await requireReadyRespondent(req);
  const { range } = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  return json(await getDashboard(r, range));
});
