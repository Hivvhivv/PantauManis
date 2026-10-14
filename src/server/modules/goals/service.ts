import "server-only";
import { z } from "zod";
import { prisma } from "@/server/db";
import type { ReadyRespondent } from "@/server/auth/guards";
import { businessRule } from "@/server/http/errors";
import { AuditAction, writeAudit } from "@/server/modules/audit";
import { addDays, diffDays, fromDbDate, localDateOf, toDbDate } from "@/server/modules/study/days";
import { buildDays } from "@/server/modules/study/series";
import {
  feedbackMessage,
  GOAL_LIMITS,
  goalLabel,
  nextChangeDate,
  weekProgress,
  type GoalMetric,
} from "./feedback";

export const goalInputSchema = z
  .object({
    metric: z.enum(["drinks", "sugar"], { error: "Pilih jenis target." }),
    targetValue: z.coerce.number({ error: "Isi nilai target." }),
  })
  .superRefine((v, ctx) => {
    const lim = GOAL_LIMITS[v.metric];
    if (v.metric === "drinks" && !Number.isInteger(v.targetValue)) {
      ctx.addIssue({
        code: "custom",
        path: ["targetValue"],
        message: "Jumlah minuman harus bilangan bulat.",
      });
    }
    if (v.targetValue < lim.min || v.targetValue > lim.max) {
      ctx.addIssue({
        code: "custom",
        path: ["targetValue"],
        message: `Nilai target ${lim.min}–${lim.max} ${lim.unit}.`,
      });
    }
  });
export type GoalInput = z.infer<typeof goalInputSchema>;

/** Target aktif, riwayat, progres 7 hari, dan umpan balik (FR-R-06). */
export async function getGoalState(r: ReadyRespondent, now = new Date()) {
  const today = localDateOf(now);
  const dayOne = fromDbDate(r.dayOneDate);
  const goals = await prisma.goal.findMany({
    where: { respondentId: r.id },
    orderBy: { validFrom: "desc" },
  });
  const active = goals.find((g) => !g.validTo) ?? null;
  const lastChange = goals[0] ? localDateOf(goals[0].validFrom) : null;
  const canChangeFrom = lastChange ? nextChangeDate(lastChange) : null;
  const canChange = !canChangeFrom || diffDays(canChangeFrom, today) >= 0;

  let progress = null;
  if (active) {
    const from = [addDays(today, -6), dayOne].sort().at(-1)!;
    const [logs, statuses] = await Promise.all([
      prisma.consumptionLog.findMany({
        where: {
          respondentId: r.id,
          deletedAt: null,
          localDate: { gte: toDbDate(from), lte: toDbDate(today) },
        },
        select: { localDate: true, servings: true, sugarGSnapshot: true },
      }),
      prisma.dailyStatus.findMany({
        where: { respondentId: r.id, date: { gte: toDbDate(from), lte: toDbDate(today) } },
        select: { date: true, status: true },
      }),
    ]);
    const days = buildDays({
      from,
      to: today,
      today,
      dayOne,
      logs: logs.map((l) => ({
        localDate: fromDbDate(l.localDate),
        servings: l.servings,
        sugarG: l.sugarGSnapshot,
        beverage: "",
      })),
      statuses: statuses.map((s) => ({ date: fromDbDate(s.date), status: s.status })),
    });
    progress = weekProgress({
      days,
      today,
      goalStart: localDateOf(active.validFrom),
      metric: active.metric,
      target: active.targetValue,
    });
  }

  const view = (g: (typeof goals)[number]) => ({
    id: g.id,
    metric: g.metric as GoalMetric,
    targetValue: g.targetValue,
    label: goalLabel(g.metric, g.targetValue),
    validFrom: g.validFrom,
    validTo: g.validTo,
  });

  return {
    active: active ? view(active) : null,
    history: goals.map(view),
    canChange,
    canChangeFrom,
    progress,
    message: feedbackMessage(progress),
  };
}

/** Tetapkan atau ubah target. Ubah paling cepat 7 hari setelah perubahan terakhir. */
export async function setGoal(r: ReadyRespondent, input: GoalInput, now = new Date()) {
  const state = await getGoalState(r, now);
  if (!state.canChange) {
    throw businessRule(
      "GOAL_CHANGE_TOO_SOON",
      `Target bisa diubah lagi mulai ${state.canChangeFrom}. Target cukup diubah sekali per minggu.`,
    );
  }
  await prisma.$transaction(async (tx) => {
    await tx.goal.updateMany({
      where: { respondentId: r.id, validTo: null },
      data: { validTo: now },
    });
    await tx.goal.create({
      data: {
        respondentId: r.id,
        metric: input.metric,
        targetValue: input.targetValue,
        validFrom: now,
      },
    });
    await writeAudit(
      {
        actor: { type: "respondent", id: r.id, ip: null },
        action: AuditAction.GoalSet,
        targetType: "respondent",
        targetId: r.id,
        metadata: { metric: input.metric, targetValue: input.targetValue },
      },
      tx,
    );
  });
}
