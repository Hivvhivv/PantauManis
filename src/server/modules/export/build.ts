/**
 * Pembentukan tabel ekspor (FR-A-07, ADR-007). Modul murni.
 * Nama kolom snake_case Bahasa Indonesia; waktu ISO 8601 WIB (+07:00); tanggal YYYY-MM-DD;
 * boolean 1/0; nilai kosong = sel kosong (bukan 0).
 */
import { addDays, diffDays } from "@/server/modules/study/days";
import { csvSafe } from "@/server/modules/respondents/csv";
import Papa from "papaparse";

export type Cell = string | number | null;
export type Column = { key: string; header: string; description: string };
export type Table = {
  name: string;
  title: string;
  columns: Column[];
  rows: Record<string, Cell>[];
};

/** ISO 8601 waktu Jakarta dengan offset, mis. 2026-10-14T19:30:00+07:00. */
export function isoWib(d: Date | null | undefined): string | null {
  if (!d) return null;
  return new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 19) + "+07:00";
}

export const bit = (v: boolean) => (v ? 1 : 0);

export type DailyStatusCode = "terisi" | "nol" | "belum_diisi" | "belum_berlangsung";

/**
 * Ringkasan harian satu responden: tepat `durationDays` baris (AC-12).
 * Belum diisi ≠ Nol: jumlah minuman dan gula dikosongkan untuk hari belum diisi/belum berlangsung.
 */
export function dailySummaryRows(params: {
  label: string;
  dayOne: string;
  today: string;
  durationDays: number;
  statuses: Map<string, "filled" | "zero">;
  totals: Map<string, { servings: number; sugarG: number }>;
}): Record<string, Cell>[] {
  return Array.from({ length: params.durationDays }, (_, i) => {
    const date = addDays(params.dayOne, i);
    const st = params.statuses.get(date);
    const future = diffDays(params.today, date) > 0;
    const status: DailyStatusCode =
      st === "filled"
        ? "terisi"
        : st === "zero"
          ? "nol"
          : future
            ? "belum_berlangsung"
            : "belum_diisi";
    const t = params.totals.get(date) ?? { servings: 0, sugarG: 0 };
    const recorded = status === "terisi" || status === "nol";
    return {
      id_responden: params.label,
      hari_ke: i + 1,
      tanggal: date,
      status,
      jumlah_minuman: recorded ? t.servings : null,
      perkiraan_gula_g: recorded ? Math.round(t.sugarG * 10) / 10 : null,
    };
  });
}

const cellText = (v: Cell) => (v === null || v === undefined ? "" : String(v));

/** CSV standar: koma, UTF-8 dengan BOM, CRLF, aman dari formula injection. */
export function tableToCsv(t: Table): string {
  const header = t.columns.map((c) => c.header);
  const data = t.rows.map((r) => t.columns.map((c) => csvSafe(cellText(r[c.key] ?? null))));
  return "﻿" + Papa.unparse({ fields: header, data }, { newline: "\r\n" });
}
