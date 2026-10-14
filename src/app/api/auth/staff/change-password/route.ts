import { requireStaff } from "@/server/auth/guards";
import { STAFF_ABSOLUTE_MS } from "@/server/auth/sessions";
import { setSessionCookie, STAFF_COOKIE } from "@/server/http/cookies";
import { json, parseJson, route, userAgent } from "@/server/http/route";
import { changeOwnPassword } from "@/server/modules/auth-service";
import { changePasswordSchema } from "@/server/modules/staff-users/schemas";

export const POST = route(async (req) => {
  const { user, actor } = await requireStaff(req, ["admin", "superadmin"], {
    allowPasswordChangePending: true,
  });
  const input = await parseJson(req, changePasswordSchema);
  const token = await changeOwnPassword({
    user,
    ...input,
    ip: actor.ip ?? "unknown",
    userAgent: userAgent(req),
  });
  const res = json({ redirectTo: "/admin" });
  setSessionCookie(res, STAFF_COOKIE, token, STAFF_ABSOLUTE_MS / 1000);
  return res;
});
