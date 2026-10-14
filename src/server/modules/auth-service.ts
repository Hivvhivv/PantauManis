import "server-only";
import { prisma } from "@/server/db";
import { env } from "@/server/env";
import { hmacAccessCode, normalizeAccessCodeInput } from "@/server/crypto/access-code";
import { hmacEmail } from "@/server/crypto/tokens";
import { hashPassword, verifyDummy, verifyPassword } from "@/server/auth/password";
import {
  checkGlobalCodeThreshold,
  isCodeLoginBlockedForIp,
  isCodeLoginGloballyPaused,
  isStaffLoginBlocked,
  recordAttempt,
} from "@/server/auth/rate-limit";
import {
  createRespondentSession,
  createStaffSession,
  revokeStaffSessions,
} from "@/server/auth/sessions";
import { AppError, businessRule, tooManyRequests, validationError } from "@/server/http/errors";
import { AuditAction, writeAudit } from "./audit";
import type { Respondent, StaffUser } from "@/generated/prisma/client";

/** Pesan umum (AC-02): penyebab kegagalan tidak dibedakan. */
export const CODE_LOGIN_FAILED = "Kode tidak valid atau tidak aktif.";
export const CODE_LOGIN_BLOCKED =
  "Terlalu banyak percobaan. Silakan coba lagi beberapa menit lagi.";
export const STAFF_LOGIN_FAILED = "Email atau kata sandi salah.";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Tujuan setelah login Responden (PRD 4.3). Pretest dibuat di Fase 2, jadi semua ke /mulai. */
/** Tujuan Responden setelah login (PRD 4.3): persetujuan → pretest → beranda. */
export function respondentHomePath(r: Pick<Respondent, "consentAt" | "dayOneDate">): string {
  if (!r.consentAt) return "/persetujuan";
  if (!r.dayOneDate) return "/pretest";
  return "/beranda";
}

export function staffHomePath(u: Pick<StaffUser, "mustChangePassword">): string {
  return u.mustChangePassword ? "/staf/ganti-kata-sandi" : "/admin";
}

export async function loginRespondent(input: {
  code: string;
  ip: string;
  userAgent: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();

  if ((await isCodeLoginGloballyPaused(now)) || (await isCodeLoginBlockedForIp(input.ip, now))) {
    await recordAttempt({ kind: "code", ip: input.ip, success: false, blocked: true, now });
    throw tooManyRequests(CODE_LOGIN_BLOCKED);
  }

  const digits = normalizeAccessCodeInput(input.code);
  const respondent = digits
    ? await prisma.respondent.findUnique({
        where: { accessCodeHmac: hmacAccessCode(digits, env().ACCESS_CODE_HMAC_SECRET) },
      })
    : null;

  if (!respondent || respondent.deletedAt || respondent.accessStatus !== "active") {
    await recordAttempt({ kind: "code", ip: input.ip, success: false, now });
    await checkGlobalCodeThreshold(now);
    throw new AppError(401, "INVALID_CODE", CODE_LOGIN_FAILED);
  }

  await recordAttempt({ kind: "code", ip: input.ip, success: true, now });
  await prisma.respondent.update({ where: { id: respondent.id }, data: { lastActiveAt: now } });
  const token = await createRespondentSession(respondent.id, input.userAgent, now);
  return { token, redirectTo: respondentHomePath(respondent) };
}

export async function loginStaff(input: {
  email: string;
  password: string;
  ip: string;
  userAgent: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const email = normalizeEmail(input.email);
  const emailHash = hmacEmail(email, env().ACCESS_CODE_HMAC_SECRET);

  if (await isStaffLoginBlocked(input.ip, emailHash, now)) {
    await recordAttempt({
      kind: "staff",
      ip: input.ip,
      emailHash,
      success: false,
      blocked: true,
      now,
    });
    throw tooManyRequests(CODE_LOGIN_BLOCKED);
  }

  const user = await prisma.staffUser.findUnique({ where: { email } });
  const ok = user
    ? await verifyPassword(user.passwordHash, input.password)
    : await verifyDummy(input.password);

  if (!user || !ok || !user.isActive || user.deletedAt) {
    await recordAttempt({ kind: "staff", ip: input.ip, emailHash, success: false, now });
    await writeAudit({
      actor: { type: "system", id: null, ip: input.ip },
      action: AuditAction.StaffLoginFailed,
      targetType: user ? "staff_user" : undefined,
      targetId: user?.id ?? null,
    });
    throw new AppError(401, "INVALID_CREDENTIALS", STAFF_LOGIN_FAILED);
  }

  await recordAttempt({ kind: "staff", ip: input.ip, emailHash, success: true, now });
  await prisma.staffUser.update({ where: { id: user.id }, data: { lastLoginAt: now } });
  const token = await createStaffSession(user.id, input.userAgent, now);
  await writeAudit({
    actor: { type: "staff", id: user.id, ip: input.ip },
    action: AuditAction.StaffLogin,
    targetType: "staff_user",
    targetId: user.id,
  });
  return { token, redirectTo: staffHomePath(user) };
}

/** Ganti kata sandi sendiri. Semua sesi lama dicabut, lalu sesi baru dibuat. */
export async function changeOwnPassword(input: {
  user: StaffUser;
  currentPassword: string;
  newPassword: string;
  ip: string;
  userAgent: string | null;
}) {
  if (!(await verifyPassword(input.user.passwordHash, input.currentPassword))) {
    throw validationError({ currentPassword: "Kata sandi saat ini salah." });
  }
  if (input.currentPassword === input.newPassword) {
    throw businessRule("SAME_PASSWORD", "Kata sandi baru harus berbeda dari kata sandi saat ini.");
  }
  await prisma.staffUser.update({
    where: { id: input.user.id },
    data: { passwordHash: await hashPassword(input.newPassword), mustChangePassword: false },
  });
  await revokeStaffSessions(input.user.id);
  await writeAudit({
    actor: { type: "staff", id: input.user.id, ip: input.ip },
    action: AuditAction.StaffPasswordChanged,
    targetType: "staff_user",
    targetId: input.user.id,
  });
  return createStaffSession(input.user.id, input.userAgent);
}
