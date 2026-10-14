import { z } from "zod";
import { isMediaKey } from "@/server/storage/media";
import { youtubeId } from "./rules";

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const quizQuestionSchema = z
  .object({
    text: z.string().trim().min(1, "Pertanyaan wajib diisi.").max(500),
    options: z
      .array(z.string().trim().min(1, "Opsi tidak boleh kosong.").max(200))
      .min(2, "Minimal 2 opsi.")
      .max(4, "Maksimal 4 opsi."),
    correctIndex: z.coerce.number().int().min(0),
  })
  .refine((q) => q.correctIndex < q.options.length, {
    path: ["correctIndex"],
    message: "Pilih jawaban yang benar.",
  });

/** Form materi edukasi (FR-A-05). */
export const materialSchema = z
  .object({
    title: z.string().trim().min(3, "Judul minimal 3 karakter.").max(150),
    summary: z.string().trim().min(1, "Ringkasan wajib diisi.").max(300, "Maksimal 300 karakter."),
    body: z
      .string()
      .trim()
      .min(1, "Isi materi wajib diisi.")
      .max(20000, "Maksimal 20.000 karakter."),
    icon: z.string().trim().min(1).max(16).default("📘"),
    imageKey: z.preprocess(
      emptyToNull,
      z.string().refine(isMediaKey, "Gambar tidak valid.").nullable(),
    ),
    imageAlt: z.preprocess(emptyToNull, z.string().trim().max(200).nullable()),
    videoUrl: z.preprocess(
      emptyToNull,
      z
        .string()
        .trim()
        .max(300)
        .refine((v) => youtubeId(v) !== null, "Masukkan tautan video YouTube yang valid.")
        .nullable(),
    ),
    source: z.preprocess(emptyToNull, z.string().trim().max(500).nullable()),
    unlockDay: z.preprocess(
      emptyToNull,
      z.coerce
        .number()
        .int()
        .min(1, "Minimal hari ke-1.")
        .max(60, "Maksimal hari ke-60.")
        .nullable(),
    ),
    status: z.enum(["draft", "published"]),
    questions: z.array(quizQuestionSchema).max(3, "Maksimal 3 soal kuis.").default([]),
  })
  .refine((m) => !m.imageKey || !!m.imageAlt, {
    path: ["imageAlt"],
    message: "Isi deskripsi gambar untuk aksesibilitas.",
  });
export type MaterialInput = z.infer<typeof materialSchema>;

export const reorderSchema = z.object({ ids: z.array(z.uuid()).min(1).max(500) });

export const quizAnswerSchema = z.object({
  answers: z.array(z.coerce.number().int().min(0).max(3)).max(3),
});
