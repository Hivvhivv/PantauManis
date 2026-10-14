import { requireStaff } from "@/server/auth/guards";
import { idParam, json, parseJson, route } from "@/server/http/route";
import { beverageTypeSchema } from "@/server/modules/beverages/schemas";
import { getBeverageType, updateBeverageType } from "@/server/modules/beverages/service";

type P = { id: string };

export const GET = route<P>(async (req, ctx) => {
  await requireStaff(req);
  return json(await getBeverageType(await idParam(ctx)));
});

/** Ubah atau nonaktifkan (isActive = false). Jenis minuman tidak dihapus karena dipakai catatan lama. */
export const PATCH = route<P>(async (req, ctx) => {
  const { actor } = await requireStaff(req);
  const id = await idParam(ctx);
  return json(await updateBeverageType(id, await parseJson(req, beverageTypeSchema), actor));
});
