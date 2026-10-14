import "server-only";
import { z } from "zod";
import { prisma } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";
import { AuditAction, actionLabel } from "./audit";

export const AUDIT_PAGE_SIZE = 50;

export const auditQuerySchema = z.object({
  action: z.string().max(64).optional().catch(undefined),
  actor: z.uuid().optional().catch(undefined),
  from: z.iso.date().optional().catch(undefined),
  to: z.iso.date().optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;

export const KNOWN_ACTIONS = Object.values(AuditAction).sort();

/** Log audit hanya-baca untuk Superadmin (FR-S-03). Rentang tanggal memakai WIB. */
export async function listAuditLogs(q: AuditQuery) {
  const where: Prisma.AuditLogWhereInput = {
    ...(q.action ? { action: q.action } : {}),
    ...(q.actor ? { actorId: q.actor } : {}),
    ...(q.from || q.to
      ? {
          createdAt: {
            ...(q.from ? { gte: new Date(`${q.from}T00:00:00+07:00`) } : {}),
            ...(q.to ? { lte: new Date(`${q.to}T23:59:59.999+07:00`) } : {}),
          },
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
    }),
  ]);

  // Nama yang mudah dibaca untuk pelaku dan target (staf → nama, responden → ID Responden).
  const ids = [
    ...new Set(rows.flatMap((r) => [r.actorId, r.targetId]).filter((x): x is string => !!x)),
  ];
  const [staff, respondents, materials] = await Promise.all([
    prisma.staffUser.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    prisma.respondent.findMany({ where: { id: { in: ids } }, select: { id: true, label: true } }),
    prisma.educationMaterial.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true },
    }),
  ]);
  const name = new Map<string, string>([
    ...staff.map((s) => [s.id, s.name] as [string, string]),
    ...respondents.map((r) => [r.id, `Responden ${r.label}`] as [string, string]),
    ...materials.map((m) => [m.id, `Materi "${m.title}"`] as [string, string]),
  ]);

  return {
    total,
    page: q.page,
    pageCount: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
    items: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      actor:
        r.actorType === "system"
          ? "Sistem"
          : r.actorId
            ? (name.get(r.actorId) ?? (r.actorType === "respondent" ? "Responden" : "Staf"))
            : "—",
      action: r.action,
      actionLabel: actionLabel(r.action),
      target: r.targetId ? (name.get(r.targetId) ?? r.targetType ?? "—") : (r.targetType ?? "—"),
      ip: r.ip,
      metadata: r.metadata,
    })),
  };
}

export async function staffOptions() {
  return prisma.staffUser.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}
