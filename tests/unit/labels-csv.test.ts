import { describe, expect, it } from "vitest";
import { labelRange, nextLabelNumber } from "@/server/modules/respondents/labels";
import { csvSafe, parseImportCsv, toCsv } from "@/server/modules/respondents/csv";

describe("label ID Responden", () => {
  it("R001–R050", () => {
    const labels = labelRange("R", 1, 50);
    expect(labels).toHaveLength(50);
    expect(labels[0]).toBe("R001");
    expect(labels[49]).toBe("R050");
  });

  it("melebar otomatis di atas 999", () => {
    expect(labelRange("R", 999, 2)).toEqual(["R0999", "R1000"]);
  });

  it("nomor berikutnya mengabaikan awalan lain dan label non-angka", () => {
    expect(nextLabelNumber(["R001", "R007", "X100", "RXYZ", "R003"], "R")).toBe(8);
    expect(nextLabelNumber([], "R")).toBe(1);
  });
});

describe("parseImportCsv", () => {
  it("membaca baris valid dan menormalkan huruf", () => {
    const r = parseImportCsv(
      "id_responden,inisial,tanggal_mulai,catatan\nr001,ab,2026-11-01,\nR002,,,Kelas pagi\n",
    );
    expect(r).toEqual({
      ok: true,
      rows: [
        { label: "R001", initials: "AB", startDate: "2026-11-01", notes: undefined },
        { label: "R002", initials: undefined, startDate: undefined, notes: "Kelas pagi" },
      ],
    });
  });

  it("menerima BOM dan header huruf besar", () => {
    const r = parseImportCsv("﻿ID_Responden\nR010\n");
    expect(r.ok).toBe(true);
  });

  it("melaporkan nomor baris yang salah", () => {
    const r = parseImportCsv("id_responden,tanggal_mulai\nR001,2026-13-40\nR001,\n");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.map((e) => e.row)).toEqual([2, 3]);
      expect(r.errors[1]!.message).toContain("lebih dari sekali");
    }
  });

  it("menolak berkas tanpa kolom id_responden", () => {
    expect(parseImportCsv("nama\nBudi\n").ok).toBe(false);
  });
});

describe("ekspor CSV", () => {
  it("mencegah formula injection", () => {
    expect(csvSafe("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvSafe("PM-482-915")).toBe("PM-482-915");
    expect(toCsv(["a"], [["+1"]])).toContain("'+1");
  });
});
