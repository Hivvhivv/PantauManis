import { requireReadyRespondent } from "@/server/auth/guards";
import { idParam, json, parseJson, route } from "@/server/http/route";
import { quizAnswerSchema } from "@/server/modules/education/schemas";
import { submitQuiz } from "@/server/modules/education/service";

export const POST = route<{ id: string }>(async (req, ctx) => {
  const r = await requireReadyRespondent(req);
  const { answers } = await parseJson(req, quizAnswerSchema);
  return json(await submitQuiz(r, await idParam(ctx), answers));
});
