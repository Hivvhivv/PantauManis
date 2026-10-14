import { requireStaff } from "@/server/auth/guards";
import { json, parseJson, route } from "@/server/http/route";
import { listQuerySchema, respondentInputSchema } from "@/server/modules/respondents/schemas";
import { createRespondent, listRespondents } from "@/server/modules/respondents/service";

export const GET = route(async (req) => {
  await requireStaff(req);
  const query = listQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  return json(await listRespondents(query));
});

export const POST = route(async (req) => {
  const { actor } = await requireStaff(req);
  const input = await parseJson(req, respondentInputSchema);
  return json(await createRespondent(input, actor), { status: 201 });
});
