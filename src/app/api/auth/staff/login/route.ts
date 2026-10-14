import { STAFF_ABSOLUTE_MS } from "@/server/auth/sessions";
import { setSessionCookie, STAFF_COOKIE } from "@/server/http/cookies";
import { clientIp, json, parseJson, route, userAgent } from "@/server/http/route";
import { loginStaff } from "@/server/modules/auth-service";
import { staffLoginSchema } from "@/server/modules/staff-users/schemas";

export const POST = route(async (req) => {
  const { email, password } = await parseJson(req, staffLoginSchema);
  const { token, redirectTo } = await loginStaff({
    email,
    password,
    ip: clientIp(req),
    userAgent: userAgent(req),
  });
  const res = json({ redirectTo });
  setSessionCookie(res, STAFF_COOKIE, token, STAFF_ABSOLUTE_MS / 1000);
  return res;
});
