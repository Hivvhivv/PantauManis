import { requireStaff } from "@/server/auth/guards";
import { json, parseJson, route } from "@/server/http/route";
import { beverageTypeSchema } from "@/server/modules/beverages/schemas";
import { createBeverageType, listBeverageTypes } from "@/server/modules/beverages/service";

export const GET = route(async (req) => {
  await requireStaff(req);
  return json({ items: await listBeverageTypes() });
});

export const POST = route(async (req) => {
  const { actor } = await requireStaff(req);
  return json(await createBeverageType(await parseJson(req, beverageTypeSchema), actor), {
    status: 201,
  });
});
