import { requireStaff } from "@/server/auth/guards";
import { json, parseJson, route } from "@/server/http/route";
import { reorderSchema } from "@/server/modules/education/schemas";
import { reorderMaterials } from "@/server/modules/education/service";

export const POST = route(async (req) => {
  const { actor } = await requireStaff(req);
  await reorderMaterials((await parseJson(req, reorderSchema)).ids, actor);
  return json({ ok: true });
});
