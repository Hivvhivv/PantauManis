import "server-only";
import type { PdfSection } from "@/lib/pdf-sections";
import { AuditAction, writeAudit, type Actor } from "@/server/modules/audit";
import { getAdminDashboard } from "@/server/modules/admin-dashboard/service";
import { loadReports, type RespondentReport } from "@/server/modules/respondents/results";
import { classifyStatus, STATUS_LABELS } from "@/server/modules/study/aggregate";

/** PDF satu responden (Detail Responden). Dicatat di log audit sebagai ekspor. */
export async function respondentPdf(id: string, sections: PdfSection[], actor: Actor) {
  const [person] = await loadReports(id);
  await writeAudit({
    actor,
    action: AuditAction.ExportDownloaded,
    targetType: "respondent",
    targetId: id,
    metadata: { format: "pdf", sections },
  });
  return person!;
}

/** PDF semua responden (List Responden): satu bagian per responden, opsional ringkasan agregat. */
export async function allRespondentsPdf(sections: PdfSection[], actor: Actor) {
  const people = await loadReports();
  const overview = sections.includes("keseluruhan")
    ? { dashboard: await getAdminDashboard({ status: "all" }), rows: people.map(overviewRow) }
    : null;
  await writeAudit({
    actor,
    action: AuditAction.ExportDownloaded,
    metadata: { format: "pdf", dataset: "semua", sections, count: people.length },
  });
  return { people, overview };
}

/** Satu baris tabel ringkasan per responden. Hari Belum diisi tidak ikut rata-rata (BR-02). */
export function overviewRow(p: RespondentReport) {
  const submitted = (q: RespondentReport["pretest"]) => (q?.status === "submitted" ? q : null);
  const status =
    STATUS_LABELS[
      classifyStatus({
        accessStatus: p.accessStatus,
        dayOne: p.started ? p.dayOne : null,
        posttestSubmitted: !!submitted(p.posttest),
      })
    ];
  const base = {
    label: p.label,
    fullName: p.fullName,
    status,
    pretestScore: submitted(p.pretest)?.score ?? null,
    posttestScore: submitted(p.posttest)?.score ?? null,
  };
  if (!p.started) {
    return { ...base, recorded: null, elapsed: null, zeroDays: null, avgSugarG: null };
  }
  const d = p.dashboard;
  const recorded = d.completeness.filled;
  const sugar = p.logs
    .filter((l) => l.studyDay <= d.durationDays)
    .reduce((s, l) => s + l.sugarG, 0);
  return {
    ...base,
    recorded,
    elapsed: d.completeness.elapsed,
    zeroDays: d.calendar.filter((c) => c.state === "zero").length,
    avgSugarG: recorded ? Math.round((sugar / recorded) * 10) / 10 : null,
  };
}
