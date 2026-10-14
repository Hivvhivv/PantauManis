import { z } from "zod";

export const beverageTypeSchema = z.object({
  name: z.string({ error: "Nama wajib diisi." }).trim().min(1, "Nama wajib diisi.").max(60),
  icon: z.string().trim().min(1).max(16).default("🥤"),
  defaultVolumeMl: z.coerce
    .number({ error: "Volume wajib diisi." })
    .int("Volume harus bilangan bulat.")
    .min(1, "Volume minimal 1 ml.")
    .max(3000, "Volume maksimal 3.000 ml."),
  sugarGPerServing: z.coerce
    .number({ error: "Gula per sajian wajib diisi." })
    .min(0, "Tidak boleh negatif.")
    .max(500, "Maksimal 500 gram."),
  sugarLevelApplicable: z.boolean(),
  source: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(300).nullable(),
  ),
  needsVerification: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});
export type BeverageTypeInput = z.infer<typeof beverageTypeSchema>;
