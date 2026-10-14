import { requireReadyRespondent } from "@/server/auth/guards";
import { json, parseJson, route } from "@/server/http/route";
import { zeroDaySchema } from "@/server/modules/consumption/schemas";
import { clearZeroDay, markZeroDay } from "@/server/modules/consumption/service";

/** "Hari ini saya tidak minum minuman manis" (BR-02). */
export const POST = route(async (req) => {
  const r = await requireReadyRespondent(req);
  const { date } = await parseJson(req, zeroDaySchema);
  await markZeroDay(r, date);
  return json({ ok: true });
});

/** Batalkan status Nol. */
export const DELETE = route(async (req) => {
  const r = await requireReadyRespondent(req);
  const { date } = await parseJson(req, zeroDaySchema);
  await clearZeroDay(r, date);
  return json({ ok: true });
});
