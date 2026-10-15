import "server-only";
import { prisma } from "@/server/db";
import { AuditAction, writeAudit } from "@/server/modules/audit";

/**
 * Rate limit login (ADR-003), dicatat di tabel login_attempts agar berlaku lintas instance.
 * Percobaan yang ditolak karena rate limit (blocked = true) tidak dihitung, sehingga satu IP
 * yang terus mencoba tidak dapat memicu jeda global sendirian.
 */
const WINDOW_MS = 15 * 60 * 1000;
const PER_KEY_LIMIT = 5;
export const GLOBAL_CODE_LIMIT = 50;
const GLOBAL_PAUSE_MS = 5 * 60 * 1000;
const ALERT_CODE_LOGIN_PAUSED = "code_login_paused";

const since = (now: Date, ms: number) => new Date(now.getTime() - ms);

async function failuresSince(
  where: { kind: "code" | "staff"; ip?: string; emailHash?: string },
  from: Date,
) {
  return prisma.loginAttempt.count({
    where: { ...where, success: false, blocked: false, createdAt: { gte: from } },
  });
}

/** Login kode ditunda untuk semua orang: minimal 5 menit sejak peringatan, dan selama gagal ≥ 50 / 15 menit. */
export async function isCodeLoginGloballyPaused(now = new Date()): Promise<boolean> {
  const recentAlert = await prisma.securityAlert.findFirst({
    where: { type: ALERT_CODE_LOGIN_PAUSED, createdAt: { gte: since(now, GLOBAL_PAUSE_MS) } },
    select: { id: true },
  });
  if (recentAlert) return true;
  return (await failuresSince({ kind: "code" }, since(now, WINDOW_MS))) >= GLOBAL_CODE_LIMIT;
}

export async function isCodeLoginBlockedForIp(ip: string, now = new Date()): Promise<boolean> {
  return (await failuresSince({ kind: "code", ip }, since(now, WINDOW_MS))) >= PER_KEY_LIMIT;
}

export async function isStaffLoginBlocked(
  ip: string,
  emailHash: string,
  now = new Date(),
): Promise<boolean> {
  const from = since(now, WINDOW_MS);
  const [byIp, byEmail] = await Promise.all([
    failuresSince({ kind: "staff", ip }, from),
    failuresSince({ kind: "staff", emailHash }, from),
  ]);
  return byIp >= PER_KEY_LIMIT || byEmail >= PER_KEY_LIMIT;
}

export async function recordAttempt(data: {
  kind: "code" | "staff";
  ip: string;
  emailHash?: string;
  success: boolean;
  blocked?: boolean;
  now?: Date;
}): Promise<void> {
  await prisma.loginAttempt.create({
    data: {
      kind: data.kind,
      ip: data.ip,
      emailHash: data.emailHash ?? null,
      success: data.success,
      blocked: data.blocked ?? false,
      createdAt: data.now ?? new Date(),
    },
  });
}

/**
 * Dipanggil setelah percobaan kode gagal. Jika ambang global terlampaui, buat satu peringatan
 * (bukan satu per percobaan) dan catat di audit log.
 */
export async function checkGlobalCodeThreshold(now = new Date()): Promise<void> {
  const failures = await failuresSince({ kind: "code" }, since(now, WINDOW_MS));
  if (failures < GLOBAL_CODE_LIMIT) return;

  const existing = await prisma.securityAlert.findFirst({
    where: { type: ALERT_CODE_LOGIN_PAUSED, createdAt: { gte: since(now, WINDOW_MS) } },
    select: { id: true },
  });
  if (existing) return;

  const alert = await prisma.securityAlert.create({
    data: {
      type: ALERT_CODE_LOGIN_PAUSED,
      details: { failures, windowMinutes: 15 },
      createdAt: now,
    },
  });
  await writeAudit({
    actor: { type: "system", id: null, ip: null },
    action: AuditAction.CodeLoginPaused,
    targetType: "security_alert",
    targetId: alert.id,
    metadata: { failures },
  });
}
