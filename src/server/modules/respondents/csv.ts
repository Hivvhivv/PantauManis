/** Impor dan ekspor CSV daftar responden. Modul murni (tanpa I/O). */
import Papa from "papaparse";
import { z } from "zod";
import {
  dateSchema,
  initialsSchema,
  labelSchema,
  notesSchema,
  type RespondentInput,
} from "./schemas";

const IMPORT_MAX_ROWS = 500;

const rowSchema = z.object({
  id_responden: labelSchema,
  inisial: z.preprocess((v) => (v === "" ? undefined : v), initialsSchema.optional()),
  tanggal_mulai: z.preprocess((v) => (v === "" ? undefined : v), dateSchema.optional()),
  catatan: z.preprocess((v) => (v === "" ? undefined : v), notesSchema.optional()),
});

type ImportResult =
  | { ok: true; rows: (RespondentInput & { label: string })[] }
  | { ok: false; errors: { row: number; message: string }[] };

/** Baris 1 = header. Nomor baris pada error mengikuti nomor baris di berkas. */
export function parseImportCsv(text: string): ImportResult {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
    transform: (v) => v.trim(),
  });

  const headers = parsed.meta.fields ?? [];
  if (!headers.includes("id_responden")) {
    return {
      ok: false,
      errors: [{ row: 1, message: "Kolom wajib 'id_responden' tidak ditemukan." }],
    };
  }
  if (parsed.data.length === 0)
    return { ok: false, errors: [{ row: 2, message: "Berkas tidak berisi data." }] };
  if (parsed.data.length > IMPORT_MAX_ROWS) {
    return {
      ok: false,
      errors: [{ row: 1, message: `Maksimal ${IMPORT_MAX_ROWS} baris per impor.` }],
    };
  }

  const errors: { row: number; message: string }[] = [];
  const rows: (RespondentInput & { label: string })[] = [];
  const seen = new Set<string>();

  parsed.data.forEach((raw, i) => {
    const rowNo = i + 2;
    // Cek duplikat lebih dulu, agar duplikat tetap terdeteksi walau kolom lain di baris itu salah.
    const id = (raw.id_responden ?? "").trim().toUpperCase();
    if (id && seen.has(id)) {
      errors.push({ row: rowNo, message: `ID Responden ${id} muncul lebih dari sekali.` });
      return;
    }
    if (id) seen.add(id);

    const result = rowSchema.safeParse(raw);
    if (!result.success) {
      errors.push({ row: rowNo, message: result.error.issues[0]?.message ?? "Data tidak valid." });
      return;
    }
    const r = result.data;
    rows.push({
      label: r.id_responden,
      initials: r.inisial,
      startDate: r.tanggal_mulai,
      notes: r.catatan,
    });
  });

  return errors.length ? { ok: false, errors } : { ok: true, rows };
}

/** Mencegah formula injection saat CSV dibuka di spreadsheet. */
export function csvSafe(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** CSV standar: koma, UTF-8 dengan BOM, CRLF, aman dari formula injection. */
export function toCsv(header: string[], rows: string[][]): string {
  return (
    "﻿" +
    Papa.unparse({ fields: header, data: rows.map((r) => r.map(csvSafe)) }, { newline: "\r\n" })
  );
}
