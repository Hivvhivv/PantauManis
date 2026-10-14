import { z } from "zod";
import { requireRespondent } from "@/server/auth/guards";
import { json, parseJson, route } from "@/server/http/route";
import {
  getQuestionnaireForRespondent,
  saveDraft,
  submit,
} from "@/server/modules/questionnaires/service";

const answersSchema = z.object({
  answers: z.record(z.string(), z.string().max(2000)),
});

export const GET = route(async (req) => {
  const r = await requireRespondent(req);
  return json(await getQuestionnaireForRespondent(r.id, "pretest"));
});

/** Simpan draf. */
export const PUT = route(async (req) => {
  const r = await requireRespondent(req);
  const { answers } = await parseJson(req, answersSchema);
  await saveDraft(r, "pretest", answers);
  return json({ ok: true });
});

/** Kirim (terkunci setelahnya). */
export const POST = route(async (req) => {
  const r = await requireRespondent(req);
  const { answers } = await parseJson(req, answersSchema);
  await submit(r, "pretest", answers);
  return json({ redirectTo: "/beranda" });
});
