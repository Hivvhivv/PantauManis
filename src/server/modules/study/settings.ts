import "server-only";
import { prisma } from "@/server/db";

export type StudySettings = {
  durationDays: number;
  posttestGraceDays: number;
  backfillDays: number;
  sugarFactors: { less: number; none: number };
  consentText: string;
};

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Pengaturan penelitian (PRD FR-S-04). Nilai default dari migration. */
export async function getStudySettings(): Promise<StudySettings> {
  const rows = await prisma.studySetting.findMany();
  const m = new Map(rows.map((r) => [r.key, r.value]));
  return {
    durationDays: num(m.get("study_duration_days"), 14),
    posttestGraceDays: num(m.get("posttest_grace_days"), 3),
    backfillDays: num(m.get("backfill_limit_days"), 2),
    sugarFactors: {
      less: num(m.get("sugar_factor_less"), 0.5),
      none: num(m.get("sugar_factor_none"), 0),
    },
    consentText: m.get("consent_text") ?? "",
  };
}
