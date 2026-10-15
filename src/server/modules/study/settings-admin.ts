import "server-only";
import { z } from "zod";
import { prisma } from "@/server/db";
import { AuditAction, writeAudit, type Actor } from "@/server/modules/audit";
import { getStudySettings } from "./settings";

/** Form Pengaturan Penelitian (FR-S-04). Zona waktu tetap Asia/Jakarta (ADR-005). */
export const settingsSchema = z.object({
  durationDays: z.coerce
    .number()
    .int("Harus bilangan bulat.")
    .min(7, "Minimal 7 hari.")
    .max(60, "Maksimal 60 hari."),
  posttestGraceDays: z.coerce
    .number()
    .int("Harus bilangan bulat.")
    .min(0)
    .max(14, "Maksimal 14 hari."),
  backfillDays: z.coerce.number().int("Harus bilangan bulat.").min(0).max(7, "Maksimal 7 hari."),
  sugarFactorLess: z.coerce.number().min(0, "Antara 0 dan 1.").max(1, "Antara 0 dan 1."),
  sugarFactorNone: z.coerce.number().min(0, "Antara 0 dan 1.").max(1, "Antara 0 dan 1."),
  consentText: z
    .string()
    .trim()
    .min(20, "Teks persetujuan terlalu pendek.")
    .max(20000, "Maksimal 20.000 karakter."),
});
type SettingsInput = z.infer<typeof settingsSchema>;

const KEYS: Record<keyof SettingsInput, string> = {
  durationDays: "study_duration_days",
  posttestGraceDays: "posttest_grace_days",
  backfillDays: "backfill_limit_days",
  sugarFactorLess: "sugar_factor_less",
  sugarFactorNone: "sugar_factor_none",
  consentText: "consent_text",
};

export async function getSettingsForm(): Promise<SettingsInput> {
  const s = await getStudySettings();
  return {
    durationDays: s.durationDays,
    posttestGraceDays: s.posttestGraceDays,
    backfillDays: s.backfillDays,
    sugarFactorLess: s.sugarFactors.less,
    sugarFactorNone: s.sugarFactors.none,
    consentText: s.consentText,
  };
}

/** Simpan pengaturan; hanya kunci yang berubah yang dicatat di audit log (tanpa nilai teks). */
export async function updateSettings(input: SettingsInput, actor: Actor) {
  const before = await getSettingsForm();
  const changed = (Object.keys(KEYS) as (keyof SettingsInput)[]).filter(
    (k) => String(before[k]) !== String(input[k]),
  );
  if (changed.length === 0) return { changed };
  await prisma.$transaction(async (tx) => {
    for (const k of changed) {
      await tx.studySetting.upsert({
        where: { key: KEYS[k] },
        create: { key: KEYS[k], value: String(input[k]) },
        update: { value: String(input[k]) },
      });
    }
    await writeAudit({ actor, action: AuditAction.SettingsUpdated, metadata: { changed } }, tx);
  });
  return { changed };
}
