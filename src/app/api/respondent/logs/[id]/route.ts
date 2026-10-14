import { requireReadyRespondent } from "@/server/auth/guards";
import { idParam, json, parseJson, route } from "@/server/http/route";
import { logInputSchema } from "@/server/modules/consumption/schemas";
import { deleteLog, getOwnLog, updateLog } from "@/server/modules/consumption/service";

type P = { id: string };

// respondent_id selalu dari sesi; ID catatan milik responden lain → 404 (BR-09, AC-07).
export const GET = route<P>(async (req, ctx) => {
  const r = await requireReadyRespondent(req);
  return json(await getOwnLog(r, await idParam(ctx)));
});

export const PATCH = route<P>(async (req, ctx) => {
  const r = await requireReadyRespondent(req);
  const id = await idParam(ctx);
  await updateLog(r, id, await parseJson(req, logInputSchema));
  return json({ ok: true });
});

export const DELETE = route<P>(async (req, ctx) => {
  const r = await requireReadyRespondent(req);
  await deleteLog(r, await idParam(ctx));
  return json({ ok: true });
});
