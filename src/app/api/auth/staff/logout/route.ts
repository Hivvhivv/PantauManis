import { deleteStaffSession, resolveStaffSession } from "@/server/auth/sessions";
import { clearSessionCookie, readCookie, STAFF_COOKIE } from "@/server/http/cookies";
import { clientIp, json, route } from "@/server/http/route";
import { AuditAction, writeAudit } from "@/server/modules/audit";

export const POST = route(async (req) => {
  const token = readCookie(req, STAFF_COOKIE);
  const user = await resolveStaffSession(token);
  await deleteStaffSession(token);
  if (user) {
    await writeAudit({
      actor: { type: "staff", id: user.id, ip: clientIp(req) },
      action: AuditAction.StaffLogout,
      targetType: "staff_user",
      targetId: user.id,
    });
  }
  const res = json({ redirectTo: "/staf/masuk" });
  clearSessionCookie(res, STAFF_COOKIE);
  return res;
});
