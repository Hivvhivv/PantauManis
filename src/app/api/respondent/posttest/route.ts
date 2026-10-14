import { z } from "zod";
import { requireReadyRespondent } from "@/server/auth/guards";
import { json, parseJson, route } from "@/server/http/route";
import {
  getQuestionnaireForRespondent,
  posttestInfo,
  saveDraft,
  submit,
} from "@/server/modules/questionnaires/service";

const answersSchema = z.object({ answers: z.record(z.string(), z.string().max(2000)) });

export const GET = route(async (req) => {
  const r = await requireReadyRespondent(req);
  const info = await posttestInfo(r);
  // Butir kuesioner hanya dikirim saat jendela posttest terbuka atau sudah dikirim.
  const questionnaire =
    info.state === "open" || info.state === "submitted"
      ? await getQuestionnaireForRespondent(r.id, "posttest")
      : null;
  return json({ ...info, questionnaire });
});

export const PUT = route(async (req) => {
  const r = await requireReadyRespondent(req);
  await saveDraft(r, "posttest", (await parseJson(req, answersSchema)).answers);
  return json({ ok: true });
});

export const POST = route(async (req) => {
  const r = await requireReadyRespondent(req);
  await submit(r, "posttest", (await parseJson(req, answersSchema)).answers);
  return json({ redirectTo: "/posttest/selesai" });
});
