import { requireReadyRespondent } from "@/server/auth/guards";
import { json, parseJson, route } from "@/server/http/route";
import { getGoalState, goalInputSchema, setGoal } from "@/server/modules/goals/service";

export const GET = route(async (req) => {
  const r = await requireReadyRespondent(req);
  return json(await getGoalState(r));
});

/** Tetapkan/ubah target (sekali per minggu). */
export const POST = route(async (req) => {
  const r = await requireReadyRespondent(req);
  await setGoal(r, await parseJson(req, goalInputSchema));
  return json(await getGoalState(r));
});
