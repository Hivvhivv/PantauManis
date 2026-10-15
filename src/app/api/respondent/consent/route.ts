import { z } from "zod";
import { requireRespondent } from "@/server/auth/guards";
import { json, parseJson, route } from "@/server/http/route";
import { respondentHomePath } from "@/server/modules/auth-service";
import { giveConsent } from "@/server/modules/questionnaires/service";

const bodySchema = z.object({
  agree: z.literal(true, { error: "Centang persetujuan untuk melanjutkan." }),
});

export const POST = route(async (req) => {
  const r = await requireRespondent(req);
  await parseJson(req, bodySchema);
  await giveConsent(r);
  return json({ redirectTo: respondentHomePath({ consentAt: new Date() }) });
});
