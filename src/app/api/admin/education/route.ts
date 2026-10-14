import { requireStaff } from "@/server/auth/guards";
import { json, parseJson, route } from "@/server/http/route";
import { materialSchema } from "@/server/modules/education/schemas";
import { createMaterial, listMaterialsAdmin } from "@/server/modules/education/service";

export const GET = route(async (req) => {
  await requireStaff(req);
  return json({ items: await listMaterialsAdmin() });
});

export const POST = route(async (req) => {
  const { actor } = await requireStaff(req);
  return json(await createMaterial(await parseJson(req, materialSchema), actor), { status: 201 });
});
