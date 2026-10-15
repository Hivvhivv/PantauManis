import "server-only";
import type { Respondent, StaffRole, StaffUser } from "@/generated/prisma/client";
import { AppError, forbidden, unauthenticated } from "@/server/http/errors";
import { readCookie, RESPONDENT_COOKIE, STAFF_COOKIE } from "@/server/http/cookies";
import { clientIp } from "@/server/http/route";
import type { Actor } from "@/server/modules/audit";
import { resolveRespondentSession, resolveStaffSession } from "./sessions";

type StaffContext = { user: StaffUser; actor: Actor };

/**
 * Pemeriksaan peran di server untuk setiap endpoint staf (ADR-001, ADR-003).
 * Hanya membaca cookie staf: sesi responden tidak pernah lolos guard ini.
 */
export async function requireStaff(
  req: Request,
  roles: StaffRole[] = ["admin", "superadmin"],
  opts: { allowPasswordChangePending?: boolean } = {},
): Promise<StaffContext> {
  const user = await resolveStaffSession(readCookie(req, STAFF_COOKIE));
  if (!user) throw unauthenticated();
  if (user.mustChangePassword && !opts.allowPasswordChangePending) {
    throw new AppError(
      403,
      "PASSWORD_CHANGE_REQUIRED",
      "Anda wajib mengganti kata sandi terlebih dahulu.",
    );
  }
  if (!roles.includes(user.role)) throw forbidden();
  return { user, actor: { type: "staff", id: user.id, ip: clientIp(req) } };
}

export const requireSuperadmin = (req: Request) => requireStaff(req, ["superadmin"]);

/** Guard responden. respondent_id selalu diambil dari sesi, bukan dari URL (BR-09). */
export async function requireRespondent(req: Request): Promise<Respondent> {
  const r = await resolveRespondentSession(readCookie(req, RESPONDENT_COOKIE));
  if (!r) throw unauthenticated();
  return r;
}

export type ReadyRespondent = Respondent & { consentAt: Date; dayOneDate: Date };

/** Responden yang sudah setuju dan sudah pretest: syarat fitur pencatatan (BR-06). */
export async function requireReadyRespondent(req: Request): Promise<ReadyRespondent> {
  const r = await requireRespondent(req);
  if (!r.consentAt)
    throw new AppError(403, "CONSENT_REQUIRED", "Berikan persetujuan terlebih dahulu.");
  if (!r.dayOneDate)
    throw new AppError(403, "PRETEST_REQUIRED", "Selesaikan kuesioner awal terlebih dahulu.");
  return r as ReadyRespondent;
}
