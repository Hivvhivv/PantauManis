import "server-only";
import { prisma } from "@/server/db";
import { newSessionToken, sha256Hex } from "@/server/crypto/tokens";
import type { Respondent, StaffUser } from "@/generated/prisma/client";

export const STAFF_IDLE_MS = 2 * 60 * 60 * 1000;
export const STAFF_ABSOLUTE_MS = 12 * 60 * 60 * 1000;
export const RESPONDENT_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const TOUCH_INTERVAL_MS = 60 * 1000;

// ---------- Staf ----------

export async function createStaffSession(
  staffUserId: string,
  userAgent: string | null,
  now = new Date(),
) {
  const token = newSessionToken();
  await prisma.staffSession.create({
    data: {
      staffUserId,
      tokenHash: sha256Hex(token),
      userAgent,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + STAFF_ABSOLUTE_MS),
    },
  });
  return token;
}

/** Mengembalikan staf pemilik sesi, atau null jika sesi tidak valid/kedaluwarsa/akun nonaktif. */
export async function resolveStaffSession(
  token: string | undefined,
  now = new Date(),
): Promise<StaffUser | null> {
  if (!token) return null;
  const session = await prisma.staffSession.findUnique({
    where: { tokenHash: sha256Hex(token) },
    include: { staffUser: true },
  });
  if (!session) return null;

  const idleExpired = now.getTime() - session.lastSeenAt.getTime() > STAFF_IDLE_MS;
  const user = session.staffUser;
  if (idleExpired || session.expiresAt <= now || !user.isActive || user.deletedAt) {
    await prisma.staffSession.deleteMany({ where: { id: session.id } });
    return null;
  }
  if (now.getTime() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.staffSession.update({ where: { id: session.id }, data: { lastSeenAt: now } });
  }
  return user;
}

export async function deleteStaffSession(token: string | undefined) {
  if (!token) return;
  await prisma.staffSession.deleteMany({ where: { tokenHash: sha256Hex(token) } });
}

export async function revokeStaffSessions(staffUserId: string) {
  await prisma.staffSession.deleteMany({ where: { staffUserId } });
}

// ---------- Responden ----------

export async function createRespondentSession(
  respondentId: string,
  userAgent: string | null,
  now = new Date(),
) {
  const token = newSessionToken();
  await prisma.respondentSession.create({
    data: {
      respondentId,
      tokenHash: sha256Hex(token),
      userAgent,
      createdAt: now,
      expiresAt: new Date(now.getTime() + RESPONDENT_SESSION_MS),
    },
  });
  return token;
}

/** Mengembalikan responden pemilik sesi, atau null jika sesi tidak valid / responden nonaktif atau dihapus. */
export async function resolveRespondentSession(
  token: string | undefined,
  now = new Date(),
): Promise<Respondent | null> {
  if (!token) return null;
  const session = await prisma.respondentSession.findUnique({
    where: { tokenHash: sha256Hex(token) },
    include: { respondent: true },
  });
  if (!session) return null;

  const r = session.respondent;
  if (session.expiresAt <= now || r.accessStatus !== "active" || r.deletedAt) {
    await prisma.respondentSession.deleteMany({ where: { id: session.id } });
    return null;
  }
  if (!r.lastActiveAt || now.getTime() - r.lastActiveAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.respondent.update({ where: { id: r.id }, data: { lastActiveAt: now } });
  }
  return r;
}

export async function deleteRespondentSession(token: string | undefined) {
  if (!token) return;
  await prisma.respondentSession.deleteMany({ where: { tokenHash: sha256Hex(token) } });
}

export async function revokeRespondentSessions(respondentId: string) {
  await prisma.respondentSession.deleteMany({ where: { respondentId } });
}
