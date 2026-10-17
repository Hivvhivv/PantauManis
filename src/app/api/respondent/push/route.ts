import { z } from "zod";
import { requireReadyRespondent } from "@/server/auth/guards";
import { json, parseJson, route, userAgent } from "@/server/http/route";
import {
  removeSubscription,
  saveSubscription,
  subscriptionSchema,
} from "@/server/modules/reminders/service";

/** Nyalakan pengingat di perangkat ini (ADR-011). */
export const POST = route(async (req) => {
  const r = await requireReadyRespondent(req);
  await saveSubscription(r, await parseJson(req, subscriptionSchema), userAgent(req));
  return json({ ok: true }, { status: 201 });
});

/** Matikan pengingat di perangkat ini. */
export const DELETE = route(async (req) => {
  const r = await requireReadyRespondent(req);
  const { endpoint } = await parseJson(req, z.object({ endpoint: z.string().max(1000) }));
  await removeSubscription(r, endpoint);
  return json({ ok: true });
});
