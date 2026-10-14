import { deleteRespondentSession } from "@/server/auth/sessions";
import { clearSessionCookie, readCookie, RESPONDENT_COOKIE } from "@/server/http/cookies";
import { json, route } from "@/server/http/route";

export const POST = route(async (req) => {
  await deleteRespondentSession(readCookie(req, RESPONDENT_COOKIE));
  const res = json({ redirectTo: "/masuk" });
  clearSessionCookie(res, RESPONDENT_COOKIE);
  return res;
});
