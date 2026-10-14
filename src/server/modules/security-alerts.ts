import "server-only";
import { prisma } from "@/server/db";
import { notFound } from "@/server/http/errors";
import { AuditAction, writeAudit, type Actor } from "./audit";

/** Peringatan yang belum dikonfirmasi, untuk banner Superadmin. */
export async function openAlerts() {
  return prisma.securityAlert.findMany({
    where: { acknowledgedAt: null },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
}

export async function acknowledgeAlert(id: string, actor: Actor) {
  const alert = await prisma.securityAlert.findUnique({ where: { id } });
  if (!alert) throw notFound();
  if (alert.acknowledgedAt) return;
  await prisma.securityAlert.update({
    where: { id },
    data: { acknowledgedAt: new Date(), acknowledgedById: actor.id },
  });
  await writeAudit({
    actor,
    action: AuditAction.SecurityAlertAcknowledged,
    targetType: "security_alert",
    targetId: id,
  });
}
