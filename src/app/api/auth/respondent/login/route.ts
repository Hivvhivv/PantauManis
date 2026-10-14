import { z } from "zod";
import { RESPONDENT_SESSION_MS } from "@/server/auth/sessions";
import { RESPONDENT_COOKIE, setSessionCookie } from "@/server/http/cookies";
import { clientIp, json, parseJson, route, userAgent } from "@/server/http/route";
import { loginRespondent } from "@/server/modules/auth-service";

const bodySchema = z.object({ code: z.string().max(64).default("") });

export const POST = route(async (req) => {
  const { code } = await parseJson(req, bodySchema);
  const { token, redirectTo } = await loginRespondent({
    code,
    ip: clientIp(req),
    userAgent: userAgent(req),
  });
  const res = json({ redirectTo });
  setSessionCookie(res, RESPONDENT_COOKIE, token, RESPONDENT_SESSION_MS / 1000);
  return res;
});
