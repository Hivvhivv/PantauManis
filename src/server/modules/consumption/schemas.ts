import { z } from "zod";

const LOCAL_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** Catatan minuman (FR-R-02, BR-04). Waktu dikirim sebagai waktu lokal WIB "YYYY-MM-DDTHH:mm". */
export const logInputSchema = z.object({
  beverageTypeId: z.uuid({ error: "Pilih jenis minuman." }),
  volumeMl: z.coerce
    .number({ error: "Isi volume minuman." })
    .int("Volume harus bilangan bulat.")
    .min(1, "Volume minimal 1 ml.")
    .max(3000, "Volume maksimal 3.000 ml."),
  servings: z.coerce
    .number({ error: "Isi jumlah porsi." })
    .int("Jumlah porsi harus bilangan bulat.")
    .min(1, "Minimal 1 porsi.")
    .max(10, "Maksimal 10 porsi."),
  sugarLevel: z.enum(["normal", "less", "none"]).nullish(),
  consumedAt: z.string().regex(LOCAL_DT, "Waktu minum tidak valid."),
  note: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(500, "Catatan maksimal 500 karakter.").optional(),
  ),
});
export type LogInput = z.infer<typeof logInputSchema>;

export const zeroDaySchema = z.object({ date: z.iso.date({ error: "Tanggal tidak valid." }) });

export const historyQuerySchema = z.object({
  from: z.iso.date().optional().catch(undefined),
  to: z.iso.date().optional().catch(undefined),
  beverageTypeId: z.uuid().optional().catch(undefined),
});
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
