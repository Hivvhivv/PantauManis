import { z } from "zod";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/server/auth/password";
import { respondentInputSchema } from "@/server/modules/respondents/schemas";

const passwordSchema = z
  .string({ error: "Kata sandi wajib diisi." })
  .min(PASSWORD_MIN, `Kata sandi minimal ${PASSWORD_MIN} karakter.`)
  .max(PASSWORD_MAX, `Kata sandi maksimal ${PASSWORD_MAX} karakter.`);

const nameSchema = z
  .string({ error: "Nama wajib diisi." })
  .trim()
  .min(1, "Nama wajib diisi.")
  .max(100);
const emailSchema = z
  .string({ error: "Email wajib diisi." })
  .trim()
  .toLowerCase()
  .pipe(z.email("Email tidak valid."));
const staffRoleSchema = z.enum(["superadmin", "admin"], { error: "Peran tidak valid." });

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v === "" ? undefined : v);

/** Form Tambah Pengguna (FR-S-01): kolom menyesuaikan dropdown peran (AC-08). */
export const createUserSchema = z.discriminatedUnion(
  "role",
  [
    z.object({
      role: z.literal("superadmin"),
      name: nameSchema,
      email: emailSchema,
      password: z.preprocess(emptyToUndefined, passwordSchema.optional()),
    }),
    z.object({
      role: z.literal("admin"),
      name: nameSchema,
      email: emailSchema,
      password: z.preprocess(emptyToUndefined, passwordSchema.optional()),
    }),
    respondentInputSchema.extend({ role: z.literal("respondent") }),
  ],
  { error: "Peran wajib dipilih." },
);
export type CreateUserInput = z.infer<typeof createUserSchema>;

/** Edit staf. Peran hanya Admin ↔ Superadmin; peran Responden ditolak (FR-S-02). */
export const updateStaffSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  role: z.enum(["superadmin", "admin"], {
    error:
      "Akun staf tidak dapat diubah menjadi Responden. Buat akun Responden baru sebagai gantinya.",
  }),
  isActive: z.boolean(),
  /** Wajib true jika peran berubah (konfirmasi). */
  confirmRoleChange: z.boolean().optional(),
});
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Kata sandi saat ini wajib diisi."),
  newPassword: passwordSchema,
});

export const staffLoginSchema = z.object({
  email: z.string().max(254).default(""),
  password: z.string().max(PASSWORD_MAX).default(""),
});

export const userListQuerySchema = z.object({
  role: z.enum(["all", "superadmin", "admin", "respondent"]).catch("all"),
  status: z.enum(["all", "active", "inactive"]).catch("all"),
  q: z.string().trim().max(100).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;

export { staffRoleSchema };
