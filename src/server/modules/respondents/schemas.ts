import { z } from "zod";

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const labelSchema = z
  .string({ error: "ID Responden wajib diisi." })
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z0-9][A-Z0-9-]{0,19}$/,
    "ID Responden hanya huruf, angka, dan strip (maks. 20 karakter).",
  );

export const initialsSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z. ]{1,10}$/, "Inisial hanya huruf (maks. 10 karakter).");

/** Nama lengkap (ADR-009): disimpan terenkripsi, tidak pernah ikut ekspor CSV/XLSX. */
export const fullNameSchema = z
  .string()
  .trim()
  .max(100, "Nama maksimal 100 karakter.")
  .regex(/^[\p{L} .,'-]+$/u, "Nama hanya boleh huruf, spasi, titik, koma, apostrof, dan strip.");

export const dateSchema = z.iso.date({ error: "Tanggal tidak valid (format TTTT-BB-HH)." });

export const notesSchema = z.string().trim().max(2000, "Catatan maksimal 2.000 karakter.");

export const respondentInputSchema = z.object({
  /** Kosong = dibuat otomatis (Rxxx berikutnya). */
  label: z.preprocess(emptyToUndefined, labelSchema.optional()),
  initials: z.preprocess(emptyToUndefined, initialsSchema.optional()),
  fullName: z.preprocess(emptyToUndefined, fullNameSchema.optional()),
  startDate: z.preprocess(emptyToUndefined, dateSchema.optional()),
  notes: z.preprocess(emptyToUndefined, notesSchema.optional()),
});
export type RespondentInput = z.infer<typeof respondentInputSchema>;

export const respondentUpdateSchema = z.object({
  label: labelSchema,
  initials: z.preprocess(emptyToUndefined, initialsSchema.nullish()),
  fullName: z.preprocess(emptyToUndefined, fullNameSchema.nullish()),
  startDate: z.preprocess(emptyToUndefined, dateSchema.nullish()),
  notes: z.preprocess(emptyToUndefined, notesSchema.nullish()),
});
export type RespondentUpdate = z.infer<typeof respondentUpdateSchema>;

export const bulkCreateSchema = z.object({
  count: z.coerce
    .number({ error: "Jumlah wajib diisi." })
    .int("Jumlah harus bilangan bulat.")
    .min(1, "Minimal 1 responden.")
    .max(200, "Maksimal 200 responden sekaligus."),
  prefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{1,5}$/, "Awalan hanya huruf (1–5 karakter).")
    .default("R"),
  startNumber: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1, "Nomor awal minimal 1.").max(99999).optional(),
  ),
});
export type BulkCreateInput = z.infer<typeof bulkCreateSchema>;

export const statusSchema = z.object({ status: z.enum(["active", "inactive"]) });

export const listQuerySchema = z.object({
  q: z.string().trim().max(50).optional().catch(undefined),
  status: z.enum(["all", "active", "inactive"]).catch("all"),
  sort: z.enum(["label", "created", "last_active"]).catch("label"),
  /** Filter progres (FR-A-02): belum pretest, kelengkapan < 50%. */
  progress: z.enum(["all", "no_pretest", "low_completeness"]).catch("all"),
  page: z.coerce.number().int().min(1).catch(1),
});
export type ListQuery = z.infer<typeof listQuerySchema>;
