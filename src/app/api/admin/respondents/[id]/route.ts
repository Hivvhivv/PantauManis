import { requireStaff, requireSuperadmin } from "@/server/auth/guards";
import { idParam, json, parseJson, route } from "@/server/http/route";
import { respondentUpdateSchema } from "@/server/modules/respondents/schemas";
import {
  getRespondentDetail,
  softDeleteRespondent,
  updateRespondent,
} from "@/server/modules/respondents/service";

type P = { id: string };

export const GET = route<P>(async (req, ctx) => {
  await requireStaff(req);
  return json(await getRespondentDetail(await idParam(ctx)));
});

export const PATCH = route<P>(async (req, ctx) => {
  const { actor } = await requireStaff(req);
  const id = await idParam(ctx);
  await updateRespondent(id, await parseJson(req, respondentUpdateSchema), actor);
  return json({ ok: true });
});

/** Hapus lunak: khusus Superadmin (matriks hak akses PRD bagian 3). */
export const DELETE = route<P>(async (req, ctx) => {
  const { actor } = await requireSuperadmin(req);
  await softDeleteRespondent(await idParam(ctx), actor);
  return json({ ok: true });
});
