import { requireStaff } from "@/server/auth/guards";
import { json, parseJson, route } from "@/server/http/route";
import { bulkCreateSchema } from "@/server/modules/respondents/schemas";
import { bulkCreateRespondents } from "@/server/modules/respondents/service";

export const POST = route(async (req) => {
  const { actor } = await requireStaff(req);
  const input = await parseJson(req, bulkCreateSchema);
  return json({ items: await bulkCreateRespondents(input, actor) }, { status: 201 });
});
