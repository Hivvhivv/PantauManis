import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_FEEDBACK_WORDS,
  feedbackMessage,
  nextChangeDate,
  weekProgress,
} from "@/server/modules/goals/feedback";
import { posttestState, posttestWindow } from "@/server/modules/study/posttest";
import { attentionReasons, classifyStatus, perStudyDay } from "@/server/modules/study/aggregate";
import { buildDays } from "@/server/modules/study/series";

const days = buildDays({
  from: "2026-10-08",
  to: "2026-10-14",
  today: "2026-10-14",
  dayOne: "2026-10-08",
  logs: [
    { localDate: "2026-10-09", servings: 1, sugarG: 20, beverage: "Teh" },
    { localDate: "2026-10-10", servings: 3, sugarG: 70, beverage: "Teh" },
    { localDate: "2026-10-12", servings: 2, sugarG: 30, beverage: "Kopi" },
  ],
  statuses: [
    { date: "2026-10-09", status: "filled" },
    { date: "2026-10-10", status: "filled" },
    { date: "2026-10-11", status: "zero" },
    { date: "2026-10-12", status: "filled" },
  ],
});

describe("progres target mingguan (FR-R-06)", () => {
  it("menilai hanya hari tercatat; Nol = 0 dan dinilai; Belum diisi tidak dinilai", () => {
    const p = weekProgress({
      days,
      today: "2026-10-14",
      goalStart: "2026-10-01",
      metric: "drinks",
      target: 2,
    });
    // 9 Okt (1) ✓, 10 Okt (3) ✗, 11 Okt Nol ✓, 12 Okt (2) ✓; 8, 13, 14 Okt belum diisi.
    expect(p).toMatchObject({ recorded: 4, achieved: 3, empty: 3 });
  });

  it("metrik gula memakai gram", () => {
    const p = weekProgress({
      days,
      today: "2026-10-14",
      goalStart: "2026-10-01",
      metric: "sugar",
      target: 25,
    });
    expect(p).toMatchObject({ recorded: 4, achieved: 2 });
  });

  it("hari sebelum target berlaku tidak dinilai", () => {
    const p = weekProgress({
      days,
      today: "2026-10-14",
      goalStart: "2026-10-11",
      metric: "drinks",
      target: 2,
    });
    expect(p).toMatchObject({ recorded: 2, achieved: 2, empty: 2 });
  });

  it("umpan balik positif tanpa kata risiko/diagnosis (BR-10)", () => {
    const cases = [
      null,
      { recorded: 0, achieved: 0, empty: 2, days: [] },
      { recorded: 4, achieved: 4, empty: 0, days: [] },
      { recorded: 7, achieved: 4, empty: 0, days: [] },
      { recorded: 5, achieved: 0, empty: 2, days: [] },
    ];
    for (const c of cases) {
      const msg = feedbackMessage(c).toLowerCase();
      for (const w of FORBIDDEN_FEEDBACK_WORDS)
        expect(msg, `${msg} memuat "${w}"`).not.toContain(w);
    }
    expect(feedbackMessage({ recorded: 7, achieved: 4, empty: 0, days: [] })).toContain(
      "4 dari 7 hari",
    );
  });

  it("target bisa diubah lagi 7 hari setelah perubahan terakhir", () => {
    expect(nextChangeDate("2026-10-10")).toBe("2026-10-17");
  });
});

describe("jendela posttest (FR-R-07)", () => {
  const base = { dayOne: "2026-10-01", durationDays: 14, graceDays: 3, submitted: false };

  it("terbuka hari ke-14 sampai ke-17", () => {
    expect(posttestWindow("2026-10-01", 14, 3)).toEqual({
      opens: "2026-10-14",
      closes: "2026-10-17",
    });
    expect(posttestState({ ...base, today: "2026-10-13" })).toBe("not_yet");
    expect(posttestState({ ...base, today: "2026-10-14" })).toBe("open");
    expect(posttestState({ ...base, today: "2026-10-17" })).toBe("open");
    expect(posttestState({ ...base, today: "2026-10-18" })).toBe("closed");
    expect(posttestState({ ...base, today: "2026-10-18", submitted: true })).toBe("submitted");
  });
});

describe("agregat Dashboard Admin (FR-A-01)", () => {
  it("klasifikasi status", () => {
    expect(classifyStatus({ accessStatus: "inactive", dayOne: "x", posttestSubmitted: true })).toBe(
      "inactive",
    );
    expect(classifyStatus({ accessStatus: "active", dayOne: "x", posttestSubmitted: true })).toBe(
      "done",
    );
    expect(classifyStatus({ accessStatus: "active", dayOne: null, posttestSubmitted: false })).toBe(
      "not_started",
    );
    expect(classifyStatus({ accessStatus: "active", dayOne: "x", posttestSubmitted: false })).toBe(
      "active",
    );
  });

  it("rata-rata per hari ke- hanya dari yang mencatat; Nol ikut sebagai 0", () => {
    const agg = perStudyDay({
      durationDays: 3,
      statuses: [
        { respondentId: "a", studyDay: 1 },
        { respondentId: "b", studyDay: 1 }, // Nol
        { respondentId: "a", studyDay: 2 },
      ],
      logs: [
        { respondentId: "a", studyDay: 1, servings: 2, sugarG: 40 },
        { respondentId: "a", studyDay: 2, servings: 1, sugarG: 10 },
        { respondentId: "c", studyDay: 1, servings: 9, sugarG: 900 }, // tanpa status → tidak dihitung
      ],
    });
    expect(agg).toEqual([
      { studyDay: 1, n: 2, avgSugarG: 20, avgDrinks: 1 },
      { studyDay: 2, n: 1, avgSugarG: 10, avgDrinks: 1 },
      { studyDay: 3, n: 0, avgSugarG: 0, avgDrinks: 0 },
    ]);
  });

  it("perlu perhatian: 2 hari berturut-turut kosong, atau posttest terlewat", () => {
    const base = { dayOne: "2026-10-01", durationDays: 14, graceDays: 3, posttestSubmitted: false };
    expect(
      attentionReasons({ ...base, today: "2026-10-06", statusDates: new Set(["2026-10-03"]) }),
    ).toEqual(["two_days_empty"]);
    expect(
      attentionReasons({ ...base, today: "2026-10-06", statusDates: new Set(["2026-10-05"]) }),
    ).toEqual([]);
    // Hari pertama/kedua: kemarin & lusa belum masuk periode.
    expect(attentionReasons({ ...base, today: "2026-10-02", statusDates: new Set() })).toEqual([]);
    expect(attentionReasons({ ...base, today: "2026-10-19", statusDates: new Set() })).toEqual([
      "posttest_missing",
    ]);
  });
});
