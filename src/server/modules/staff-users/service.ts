import "server-only";
import { prisma, type Tx } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { temporaryPassword } from "@/server/crypto/tokens";
import { maskAccessCode } from "@/server/crypto/access-code";
import { decrypt } from "@/server/crypto/encryption";
import { env } from "@/server/env";
import { businessRule, conflict, notFound } from "@/server/http/errors";
import { AuditAction, writeAudit, type Actor } from "@/server/modules/audit";
import { createRespondent, type IssuedCode } from "@/server/modules/respondents/service";
import type { StaffRole, StaffUser } from "@/generated/prisma/client";
import { checkStaffChange, type StaffChange } from "./rules";
import type { CreateUserInput, UpdateStaffInput, UserListQuery } from "./schemas";

const USER_PAGE_SIZE = 20;

// Kunci advisory agar pemeriksaan "minimal satu Superadmin aktif" tidak bisa dilewati oleh
// dua request yang berjalan bersamaan.
const SUPERADMIN_LOCK = 724_001;

async function lockSuperadmins(tx: Tx) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SUPERADMIN_LOCK})`;
}

async function countActiveSuperadmins(tx: Tx) {
  return tx.staffUser.count({ where: { role: "superadmin", isActive: true, deletedAt: null } });
}

async function findStaff(tx: Tx | typeof prisma, id: string): Promise<StaffUser> {
  const u = await tx.staffUser.findFirst({ where: { id, deletedAt: null } });
  if (!u) throw notFound("Pengguna tidak ditemukan.");
  return u;
}

async function enforceRules(tx: Tx, actor: Actor, target: StaffUser, change: StaffChange) {
  const violation = checkStaffChange({
    actorId: actor.id ?? "",
    target,
    change,
    activeSuperadmins: await countActiveSuperadmins(tx),
  });
  if (violation) throw businessRule(violation.code, violation.message);
}

type CreateUserResult =
  | { kind: "staff"; id: string; temporaryPassword: string | null }
  | { kind: "respondent"; issued: IssuedCode };

/** Tambah pengguna dari dropdown peran (FR-S-01). Peran Responden → kode dibuat otomatis (AC-08). */
export async function createUser(input: CreateUserInput, actor: Actor): Promise<CreateUserResult> {
  if (input.role === "respondent") {
    const { role: _role, ...rest } = input;
    void _role;
    return { kind: "respondent", issued: await createRespondent(rest, actor) };
  }

  const generated = input.password ? null : temporaryPassword();
  const passwordHash = await hashPassword(input.password ?? generated!);
  const exists = await prisma.staffUser.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (exists) throw conflict("Email sudah dipakai.", { email: "Email sudah dipakai." });

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.staffUser.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash,
        mustChangePassword: true,
      },
    });
    await writeAudit(
      {
        actor,
        action: AuditAction.StaffCreated,
        targetType: "staff_user",
        targetId: u.id,
        metadata: { role: u.role },
      },
      tx,
    );
    return u;
  });
  return { kind: "staff", id: user.id, temporaryPassword: generated };
}

export async function updateStaff(id: string, input: UpdateStaffInput, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    await lockSuperadmins(tx);
    const target = await findStaff(tx, id);
    const roleChanged = input.role !== target.role;
    if (roleChanged && !input.confirmRoleChange) {
      throw businessRule("CONFIRMATION_REQUIRED", "Perubahan peran perlu dikonfirmasi.");
    }
    await enforceRules(tx, actor, target, { role: input.role, isActive: input.isActive });

    if (input.email !== target.email) {
      const taken = await tx.staffUser.findUnique({
        where: { email: input.email },
        select: { id: true },
      });
      if (taken) throw conflict("Email sudah dipakai.", { email: "Email sudah dipakai." });
    }

    await tx.staffUser.update({
      where: { id },
      data: { name: input.name, email: input.email, role: input.role, isActive: input.isActive },
    });
    if (!input.isActive) await tx.staffSession.deleteMany({ where: { staffUserId: id } });

    const base = { actor, targetType: "staff_user" as const, targetId: id };
    await writeAudit({ ...base, action: AuditAction.StaffUpdated }, tx);
    if (roleChanged) {
      await writeAudit(
        {
          ...base,
          action: AuditAction.StaffRoleChanged,
          metadata: { from: target.role, to: input.role },
        },
        tx,
      );
    }
    if (input.isActive !== target.isActive) {
      await writeAudit(
        {
          ...base,
          action: input.isActive ? AuditAction.StaffActivated : AuditAction.StaffDeactivated,
        },
        tx,
      );
    }
  });
}

/** Reset kata sandi staf lain. Kata sandi sementara ditampilkan sekali dan wajib diganti. */
export async function resetStaffPassword(id: string, actor: Actor): Promise<string> {
  if (id === actor.id) {
    throw businessRule("SELF_RESET", "Gunakan menu Ganti Kata Sandi untuk akun Anda sendiri.");
  }
  const target = await findStaff(prisma, id);
  const password = temporaryPassword();
  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    await tx.staffUser.update({
      where: { id: target.id },
      data: { passwordHash, mustChangePassword: true },
    });
    await tx.staffSession.deleteMany({ where: { staffUserId: target.id } });
    await writeAudit(
      {
        actor,
        action: AuditAction.StaffPasswordReset,
        targetType: "staff_user",
        targetId: target.id,
      },
      tx,
    );
  });
  return password;
}

export async function softDeleteStaff(id: string, actor: Actor) {
  await prisma.$transaction(async (tx) => {
    await lockSuperadmins(tx);
    const target = await findStaff(tx, id);
    await enforceRules(tx, actor, target, { delete: true });
    await tx.staffUser.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    await tx.staffSession.deleteMany({ where: { staffUserId: id } });
    await writeAudit(
      { actor, action: AuditAction.StaffDeleted, targetType: "staff_user", targetId: id },
      tx,
    );
  });
}

export async function getStaff(id: string) {
  const u = await findStaff(prisma, id);
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt,
  };
}

type UserRow = {
  kind: "staff" | "respondent";
  id: string;
  role: StaffRole | "respondent";
  /** Nama staf atau ID Responden. */
  name: string;
  /** Email staf atau kode tersamar responden. */
  secondary: string;
  isActive: boolean;
  lastActiveAt: Date | null;
};

const ROLE_ORDER = { superadmin: 0, admin: 1, respondent: 2 } as const;

/** Satu tabel untuk semua pengguna (FR-S-01). Data staf dan responden tetap di tabel terpisah. */
export async function listUsers(query: UserListQuery) {
  const wantStaff = query.role === "all" || query.role === "admin" || query.role === "superadmin";
  const wantRespondents = query.role === "all" || query.role === "respondent";
  const q = query.q;

  const [staff, respondents] = await Promise.all([
    wantStaff
      ? prisma.staffUser.findMany({
          where: {
            deletedAt: null,
            ...(query.role === "admin" || query.role === "superadmin" ? { role: query.role } : {}),
            ...(query.status !== "all" ? { isActive: query.status === "active" } : {}),
            ...(q
              ? {
                  OR: [
                    { name: { contains: q, mode: "insensitive" as const } },
                    { email: { contains: q, mode: "insensitive" as const } },
                  ],
                }
              : {}),
          },
        })
      : [],
    wantRespondents
      ? prisma.respondent.findMany({
          where: {
            deletedAt: null,
            ...(query.status !== "all" ? { accessStatus: query.status } : {}),
            ...(q
              ? {
                  OR: [
                    { label: { contains: q, mode: "insensitive" as const } },
                    { initials: { contains: q, mode: "insensitive" as const } },
                  ],
                }
              : {}),
          },
        })
      : [],
  ]);

  const key = env().ACCESS_CODE_ENC_KEY;
  const rows: UserRow[] = [
    ...staff.map((u) => ({
      kind: "staff" as const,
      id: u.id,
      role: u.role,
      name: u.name,
      secondary: u.email,
      isActive: u.isActive,
      lastActiveAt: u.lastLoginAt,
    })),
    ...respondents.map((r) => ({
      kind: "respondent" as const,
      id: r.id,
      role: "respondent" as const,
      name: r.label,
      secondary: maskAccessCode(decrypt(r.accessCodeEncrypted, key)),
      isActive: r.accessStatus === "active",
      lastActiveAt: r.lastActiveAt,
    })),
  ].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name, "id"));

  const total = rows.length;
  const start = (query.page - 1) * USER_PAGE_SIZE;
  return {
    items: rows.slice(start, start + USER_PAGE_SIZE),
    total,
    page: query.page,
    pageCount: Math.max(1, Math.ceil(total / USER_PAGE_SIZE)),
  };
}
