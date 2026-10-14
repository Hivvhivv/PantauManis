import { requireStaff } from "@/server/auth/guards";
import { idParam, json, parseJson, route } from "@/server/http/route";
import { materialSchema } from "@/server/modules/education/schemas";
import {
  deleteMaterial,
  getMaterialAdmin,
  updateMaterial,
} from "@/server/modules/education/service";

type P = { id: string };

export const GET = route<P>(async (req, ctx) => {
  await requireStaff(req);
  return json(await getMaterialAdmin(await idParam(ctx)));
});

export const PUT = route<P>(async (req, ctx) => {
  const { actor } = await requireStaff(req);
  const id = await idParam(ctx);
  await updateMaterial(id, await parseJson(req, materialSchema), actor);
  return json({ ok: true });
});

export const DELETE = route<P>(async (req, ctx) => {
  const { actor } = await requireStaff(req);
  await deleteMaterial(await idParam(ctx), actor);
  return json({ ok: true });
});
