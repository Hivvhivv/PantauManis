import { describe, expect, it } from "vitest";
import {
  addDays,
  editableDates,
  fromLocalDateTime,
  localDateOf,
  studyDayOf,
  toLocalDateTime,
} from "@/server/modules/study/days";
import { estimateSugarG } from "@/server/modules/study/estimate";
import {
  buildDays,
  completeness,
  composition,
  rangeDates,
  weekly,
} from "@/server/modules/study/series";
import {
  scoreAnswers,
  validateAnswers,
  type QuestionDef,
} from "@/server/modules/questionnaires/scoring";

describe("hari penelitian (BR-01, zona Asia/Jakarta)", () => {
  it("tanggal lokal mengikuti WIB, bukan UTC", () => {
    // 2026-10-14 17:30 UTC = 15 Okt 00.30 WIB
    expect(localDateOf(new Date("2026-10-14T17:30:00Z"))).toBe("2026-10-15");
    // 2026-10-14 16:59 UTC = 14 Okt 23.59 WIB
    expect(localDateOf(new Date("2026-10-14T16:59:00Z"))).toBe("2026-10-14");
  });

  it("tanggal pretest = hari ke-1; melewati batas bulan", () => {
    expect(studyDayOf("2026-10-25", "2026-10-25")).toBe(1);
    expect(studyDayOf("2026-10-25", "2026-11-07")).toBe(14);
    expect(studyDayOf("2026-10-25", "2026-11-08")).toBe(15);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("konversi waktu lokal bolak-balik", () => {
    const d = fromLocalDateTime("2026-10-14T23:30");
    expect(d.toISOString()).toBe("2026-10-14T16:30:00.000Z");
    expect(toLocalDateTime(d)).toBe("2026-10-14T23:30");
  });

  it("jendela susulan: hari ini + 2 hari ke belakang, tidak sebelum hari ke-1 (BR-05)", () => {
    expect(editableDates("2026-10-20", "2026-10-10", 2)).toEqual([
      "2026-10-18",
      "2026-10-19",
      "2026-10-20",
    ]);
    expect(editableDates("2026-10-11", "2026-10-10", 2)).toEqual(["2026-10-10", "2026-10-11"]);
  });
});

describe("estimasi gula", () => {
  const base = { sugarGPerServing: 20, defaultVolumeMl: 250, factors: { less: 0.5, none: 0 } };

  it("proporsional volume dan porsi", () => {
    expect(
      estimateSugarG({
        ...base,
        volumeMl: 500,
        servings: 2,
        sugarLevel: "normal",
        sugarLevelApplicable: true,
      }),
    ).toBe(80);
  });

  it("faktor tingkat gula hanya bila relevan", () => {
    expect(
      estimateSugarG({
        ...base,
        volumeMl: 250,
        servings: 1,
        sugarLevel: "less",
        sugarLevelApplicable: true,
      }),
    ).toBe(10);
    expect(
      estimateSugarG({
        ...base,
        volumeMl: 250,
        servings: 1,
        sugarLevel: "none",
        sugarLevelApplicable: true,
      }),
    ).toBe(0);
    expect(
      estimateSugarG({
        ...base,
        volumeMl: 250,
        servings: 1,
        sugarLevel: "none",
        sugarLevelApplicable: false,
      }),
    ).toBe(20);
  });

  it("dibulatkan satu desimal", () => {
    expect(
      estimateSugarG({
        ...base,
        volumeMl: 333,
        servings: 1,
        sugarLevel: null,
        sugarLevelApplicable: true,
      }),
    ).toBe(26.6);
  });
});

describe("data dashboard: Belum diisi ≠ Nol (BR-02)", () => {
  const days = buildDays({
    from: "2026-10-09",
    to: "2026-10-14",
    today: "2026-10-12",
    dayOne: "2026-10-10",
    logs: [
      { localDate: "2026-10-10", servings: 2, sugarG: 30, beverage: "Teh manis" },
      { localDate: "2026-10-10", servings: 1, sugarG: 12.5, beverage: "Kopi susu" },
    ],
    statuses: [
      { date: "2026-10-10", status: "filled" },
      { date: "2026-10-11", status: "zero" },
    ],
  });

  it("status per hari", () => {
    expect(days.map((d) => d.state)).toEqual([
      "before",
      "filled",
      "zero",
      "empty",
      "future",
      "future",
    ]);
    expect(days.map((d) => d.studyDay)).toEqual([null, 1, 2, 3, 4, 5]);
  });

  it("Nol dan Belum diisi sama-sama 0 minuman, tetapi status berbeda", () => {
    const zero = days[2]!;
    const empty = days[3]!;
    expect([zero.drinks, empty.drinks]).toEqual([0, 0]);
    expect(zero.state).not.toBe(empty.state);
  });

  it("jumlah minuman dan gula per hari", () => {
    expect(days[1]).toMatchObject({ drinks: 3, sugarG: 42.5 });
  });

  it("komposisi jenis minuman", () => {
    expect(
      composition([
        { localDate: "x", servings: 1, sugarG: 1, beverage: "Soda" },
        { localDate: "x", servings: 3, sugarG: 1, beverage: "Teh manis" },
        { localDate: "x", servings: 1, sugarG: 1, beverage: "Soda" },
      ]),
    ).toEqual([
      { beverage: "Teh manis", servings: 3 },
      { beverage: "Soda", servings: 2 },
    ]);
  });

  it("rentang: 2 minggu = hari ke-1–14; lainnya = N hari terakhir", () => {
    expect(rangeDates("2w", "2026-10-30", "2026-10-10", 14)).toEqual({
      from: "2026-10-10",
      to: "2026-10-23",
    });
    expect(rangeDates("1w", "2026-10-30", "2026-10-10", 14)).toEqual({
      from: "2026-10-24",
      to: "2026-10-30",
    });
  });

  it("rentang 1 tahun dijumlah per minggu", () => {
    const w = weekly(days);
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ drinks: 3, sugarG: 42.5 });
  });
});

describe("kelengkapan pencatatan", () => {
  it("hari terisi (termasuk Nol) / hari berjalan, maksimal 14", () => {
    expect(
      completeness({
        dayOne: "2026-10-10",
        today: "2026-10-15",
        durationDays: 14,
        statusDates: ["2026-10-10", "2026-10-12", "2026-10-15"],
      }),
    ).toEqual({ filled: 3, elapsed: 6 });
    expect(
      completeness({
        dayOne: "2026-10-01",
        today: "2026-12-01",
        durationDays: 14,
        statusDates: ["2026-10-01", "2026-11-20"],
      }),
    ).toEqual({ filled: 1, elapsed: 14 });
  });
});

describe("kuesioner", () => {
  const qs: QuestionDef[] = [
    {
      id: "a",
      type: "choice",
      required: true,
      options: [
        { value: "0", label: "x", score: 0 },
        { value: "3", label: "y", score: 3 },
      ],
    },
    { id: "b", type: "likert", required: true, options: [{ value: "5", label: "z", score: 5 }] },
    { id: "c", type: "text", required: false, options: null },
  ];

  it("draf boleh belum lengkap; kirim wajib lengkap", () => {
    expect(validateAnswers(qs, { a: "3" }, false)).toEqual({});
    expect(validateAnswers(qs, { a: "3" }, true)).toEqual({ b: "Wajib diisi." });
  });

  it("menolak pilihan dan butir yang tidak dikenal", () => {
    expect(validateAnswers(qs, { a: "9", zz: "1" }, false)).toEqual({
      a: "Pilihan tidak valid.",
      zz: "Butir tidak dikenal.",
    });
  });

  it("skor = jumlah skor pilihan", () => {
    expect(scoreAnswers(qs, { a: "3", b: "5", c: "teh" })).toBe(8);
  });
});
