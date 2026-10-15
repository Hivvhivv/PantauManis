import "server-only";
import { prisma, type Tx } from "@/server/db";
import type { ActorType } from "@/generated/prisma/client";

export const AuditAction = {
  StaffLogin: "staff.login",
  StaffLoginFailed: "staff.login_failed",
  StaffLogout: "staff.logout",
  StaffPasswordChanged: "staff.password_changed",
  StaffCreated: "staff.created",
  StaffUpdated: "staff.updated",
  StaffRoleChanged: "staff.role_changed",
  StaffActivated: "staff.activated",
  StaffDeactivated: "staff.deactivated",
  StaffPasswordReset: "staff.password_reset",
  StaffDeleted: "staff.deleted",
  RespondentCreated: "respondent.created",
  RespondentUpdated: "respondent.updated",
  RespondentCodeRevealed: "respondent.code_revealed",
  RespondentCodeReset: "respondent.code_reset",
  RespondentActivated: "respondent.activated",
  RespondentDeactivated: "respondent.deactivated",
  RespondentDeleted: "respondent.deleted",
  RespondentsBulkCreated: "respondents.bulk_created",
  RespondentsImported: "respondents.imported",
  RespondentCodesDownloaded: "respondents.codes_downloaded",
  RespondentCardsPrinted: "respondents.cards_printed",
  CodeLoginPaused: "security.code_login_paused",
  SecurityAlertAcknowledged: "security.alert_acknowledged",
  BeverageTypeCreated: "beverage_type.created",
  BeverageTypeUpdated: "beverage_type.updated",
  GoalSet: "goal.set",
  RespondentResultsViewed: "respondent.results_viewed",
  SettingsUpdated: "settings.updated",
  MaterialCreated: "education.created",
  MaterialUpdated: "education.updated",
  MaterialDeleted: "education.deleted",
  MaterialsReordered: "education.reordered",
  ExportDownloaded: "export.downloaded",
  QuestionnaireUpdated: "questionnaire.updated",
} as const;

type AuditActionName = (typeof AuditAction)[keyof typeof AuditAction];

export type Actor = { type: ActorType; id: string | null; ip: string | null };

type AuditEntry = {
  actor: Actor;
  action: AuditActionName;
  targetType?:
    "staff_user" | "respondent" | "security_alert" | "beverage_type" | "education_material";
  targetId?: string | null;
  /** Jangan pernah memasukkan kode akses, kata sandi, token, atau jawaban kuesioner. */
  metadata?: Record<string, string | number | boolean | null | string[]>;
};

export async function writeAudit(
  entry: AuditEntry,
  tx: Tx | typeof prisma = prisma,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorType: entry.actor.type,
      actorId: entry.actor.id,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      ip: entry.actor.ip,
      metadata: entry.metadata ?? undefined,
    },
  });
}

const ACTION_LABELS: Partial<Record<string, string>> = {
  [AuditAction.RespondentCreated]: "Responden dibuat",
  [AuditAction.RespondentUpdated]: "Data responden diubah",
  [AuditAction.RespondentCodeRevealed]: "Kode akses ditampilkan",
  [AuditAction.RespondentCodeReset]: "Kode akses di-reset",
  [AuditAction.RespondentActivated]: "Akses diaktifkan",
  [AuditAction.RespondentDeactivated]: "Akses dinonaktifkan",
  [AuditAction.RespondentDeleted]: "Responden dihapus",
  [AuditAction.RespondentResultsViewed]: "Hasil responden dibuka",
  [AuditAction.GoalSet]: "Target ditetapkan/diubah",
  [AuditAction.ExportDownloaded]: "Data responden diekspor",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

/** Riwayat tindakan pada satu responden (FR-A-03). */
export async function respondentHistory(respondentId: string, limit = 50) {
  const logs = await prisma.auditLog.findMany({
    where: { targetType: "respondent", targetId: respondentId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const staffIds = [...new Set(logs.map((l) => l.actorId).filter((x): x is string => !!x))];
  const staff = await prisma.staffUser.findMany({
    where: { id: { in: staffIds } },
    select: { id: true, name: true },
  });
  const names = new Map(staff.map((s) => [s.id, s.name]));
  return logs.map((l) => ({
    id: l.id,
    action: l.action,
    label: actionLabel(l.action),
    actorName:
      l.actorType === "respondent"
        ? "Responden"
        : l.actorId
          ? (names.get(l.actorId) ?? "—")
          : "Sistem",
    createdAt: l.createdAt,
  }));
}
