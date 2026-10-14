import { describe, expect, it } from "vitest";
import { dailySummaryRows, isoWib, tableToCsv } from "@/server/modules/export/build";

describe("format waktu ekspor", () => {
  it("ISO 8601 WIB dengan offset", () => {
    expect(isoWib(new Date("2026-10-14T12:30:05Z"))).toBe("2026-10-14T19:30:05+07:00");
    expect(isoWib(new Date("2026-10-14T17:30:00Z"))).toBe("2026-10-15T00:30:00+07:00");
    expect(isoWib(null)).toBeNull();
  });
});

describe("ringkasan harian (AC-12)", () => {
  const rows = dailySummaryRows({
    label: "R001",
    dayOne: "2026-10-01",
    today: "2026-10-05",
    durationDays: 14,
    statuses: new Map([
      ["2026-10-01", "filled"],
      ["2026-10-02", "zero"],
    ]),
    totals: new Map([["2026-10-01", { servings: 2, sugarG: 41.25 }]]),
  });

  it("tepat 14 baris, hari ke-1..14", () => {
    expect(rows).toHaveLength(14);
    expect(rows.map((r) => r.hari_ke)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
  });

  it("Terisi / Nol / Belum diisi / belum berlangsung dibedakan; belum diisi bukan 0", () => {
    expect(rows[0]).toMatchObject({ status: "terisi", jumlah_minuman: 2, perkiraan_gula_g: 41.3 });
    expect(rows[1]).toMatchObject({ status: "nol", jumlah_minuman: 0, perkiraan_gula_g: 0 });
    expect(rows[2]).toMatchObject({
      status: "belum_diisi",
      jumlah_minuman: null,
      perkiraan_gula_g: null,
    });
    expect(rows[5]).toMatchObject({ status: "belum_berlangsung", jumlah_minuman: null });
  });
});

describe("CSV ekspor", () => {
  it("koma, BOM, kosong untuk null, aman dari formula", () => {
    const csv = tableToCsv({
      name: "x",
      title: "x",
      columns: [
        { key: "a", header: "a", description: "" },
        { key: "b", header: "b", description: "" },
      ],
      rows: [
        { a: "=HYPERLINK(1)", b: null },
        { a: "teh, manis", b: 3 },
      ],
    });
    expect(csv.startsWith("﻿a,b\r\n")).toBe(true);
    expect(csv).toContain("'=HYPERLINK(1),");
    expect(csv).toContain('"teh, manis",3');
  });
});
