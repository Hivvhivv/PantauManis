import "server-only";
import { prisma } from "@/server/db";
import type { ReadyRespondent } from "@/server/auth/guards";
import { notFound } from "@/server/http/errors";
import { AuditAction, writeAudit, type Actor } from "@/server/modules/audit";
import { getDashboard } from "@/server/modules/consumption/dashboard";
import { educationActivity } from "@/server/modules/education/service";
import { getGoalState } from "@/server/modules/goals/service";
import type { QuestionOption } from "@/server/modules/questionnaires/scoring";
import { fromDbDate, toLocalDateTime } from "@/server/modules/study/days";

async function questionnaireResult(respondentId: string, type: "pretest" | "posttest") {
  const q = await prisma.questionnaire.findFirst({
    where: { type, isActive: true },
    orderBy: { version: "desc" },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!q) return null;
  const resp = await prisma.questionnaireResponse.findUnique({
    where: { respondentId_questionnaireId: { respondentId, questionnaireId: q.id } },
    include: { answers: true },
  });
  const byQ = new Map((resp?.answers ?? []).map((a) => [a.questionId, a.value]));
  return {
    title: q.title,
    status: resp?.status ?? null,
    submittedAt: resp?.submittedAt ?? null,
    score: resp?.score ?? null,
    answers: q.questions.map((x) => {
      const value = byQ.get(x.id) ?? null;
      const opt = (x.options as QuestionOption[] | null)?.find((o) => o.value === value);
      return { order: x.order, text: x.text, answer: opt?.label ?? value };
    }),
  };
}

/**
 * Data "Lihat Hasil Responden" (FR-A-04). Hanya diambil saat tombol diklik (ADR-006);
 * setiap pemanggilan dicatat di audit log (AC-05).
 */
export async function getRespondentResults(id: string, actor: Actor) {
  const r = await prisma.respondent.findFirst({ where: { id, deletedAt: null } });
  if (!r) throw notFound("Responden tidak ditemukan.");
  await writeAudit({
    actor,
    action: AuditAction.RespondentResultsViewed,
    targetType: "respondent",
    targetId: id,
  });

  const [pretest, posttest] = await Promise.all([
    questionnaireResult(id, "pretest"),
    questionnaireResult(id, "posttest"),
  ]);
  if (!r.consentAt || !r.dayOneDate) {
    return { label: r.label, started: false as const, pretest, posttest };
  }

  const ready = r as ReadyRespondent;
  const [dashboard, education, goals, logs] = await Promise.all([
    getDashboard(ready, "2w"),
    educationActivity(id),
    getGoalState(ready),
    prisma.consumptionLog.findMany({
      where: { respondentId: id, deletedAt: null },
      include: { beverageType: { select: { name: true } } },
      orderBy: { consumedAt: "asc" },
    }),
  ]);

  return {
    label: r.label,
    started: true as const,
    dayOne: fromDbDate(r.dayOneDate),
    dashboard,
    goals,
    education,
    logs: logs.map((l) => ({
      id: l.id,
      consumedAt: toLocalDateTime(l.consumedAt).replace("T", " "),
      studyDay: l.studyDay,
      beverage: l.beverageType.name,
      volumeMl: l.volumeMl,
      servings: l.servings,
      sugarLevel: l.sugarLevel,
      sugarG: l.sugarGSnapshot,
      isBackfill: l.isBackfill,
      isOutOfPeriod: l.isOutOfPeriod,
      note: l.note,
    })),
    pretest,
    posttest,
  };
}

export type RespondentResults = Awaited<ReturnType<typeof getRespondentResults>>;
