import "server-only";
import { prisma } from "@/server/db";
import { AuditAction, writeAudit, type Actor } from "@/server/modules/audit";
import { getAdminDashboard } from "@/server/modules/admin-dashboard/service";
import { decryptName } from "@/server/modules/respondents/service";
import { getStudySettings } from "@/server/modules/study/settings";
import { buildTables } from "./service";

const STATUS_TEXT: Record<string, string> = {
  belum_mulai: "Belum mulai",
  aktif: "Aktif",
  selesai: "Selesai",
  nonaktif: "Nonaktif",
};

const num = (v: unknown) => (typeof v === "number" ? v : null);

/**
 * PDF hasil keseluruhan (ADR-009): agregat Dashboard Admin + satu baris ringkas per responden
 * (dengan nama lengkap). Dicatat di log audit sebagai ekspor.
 */
export async function getOverallReport(actor: Actor, now = new Date()) {
  const settings = await getStudySettings();
  const [dashboard, [table], people, sugar, responses] = await Promise.all([
    getAdminDashboard({ status: "all" }, now),
    buildTables(["responden"], {}, now),
    prisma.respondent.findMany({
      where: { deletedAt: null },
      select: { id: true, label: true, fullNameEncrypted: true },
    }),
    prisma.consumptionLog.groupBy({
      by: ["respondentId"],
      where: { deletedAt: null, studyDay: { lte: settings.durationDays } },
      _sum: { sugarGSnapshot: true },
    }),
    prisma.questionnaireResponse.findMany({
      where: { status: "submitted" },
      select: { respondentId: true, score: true, questionnaire: { select: { type: true } } },
    }),
  ]);
  await writeAudit({
    actor,
    action: AuditAction.ExportDownloaded,
    metadata: { format: "pdf", dataset: "keseluruhan", count: people.length },
  });

  const byLabel = new Map(people.map((p) => [p.label, p]));
  const sugarBy = new Map(sugar.map((s) => [s.respondentId, s._sum.sugarGSnapshot ?? 0]));
  const score = (id: string, type: "pretest" | "posttest") =>
    responses.find((r) => r.respondentId === id && r.questionnaire.type === type)?.score ?? null;

  const rows = table!.rows.map((row) => {
    const p = byLabel.get(String(row.id_responden))!;
    const recorded = num(row.hari_tercatat);
    return {
      label: p.label,
      fullName: decryptName(p.fullNameEncrypted),
      status: STATUS_TEXT[String(row.status_penelitian)] ?? "—",
      recorded,
      elapsed: num(row.hari_berjalan),
      zeroDays: num(row.hari_nol),
      // Rata-rata per hari tercatat (Terisi + Nol); hari Belum diisi tidak ikut.
      avgSugarG: recorded ? Math.round(((sugarBy.get(p.id) ?? 0) / recorded) * 10) / 10 : null,
      pretestScore: score(p.id, "pretest"),
      posttestScore: score(p.id, "posttest"),
    };
  });

  return { dashboard, rows };
}
