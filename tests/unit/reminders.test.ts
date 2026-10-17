import { describe, expect, it } from "vitest";
import { REMINDER_MESSAGES, reminderFor } from "@/server/modules/reminders/rules";
import { addDays } from "@/server/modules/study/days";

const DAY1 = "2026-11-01";
const base = {
  dayOne: DAY1,
  durationDays: 14,
  graceDays: 3,
  recordedToday: false,
  posttestSubmitted: false,
};
const onDay = (n: number, extra: Partial<typeof base> = {}) =>
  reminderFor({ ...base, ...extra, today: addDays(DAY1, n - 1) });

describe("pengingat (ADR-011)", () => {
  it("harian hanya bila hari itu Belum diisi (Nol dan Terisi tidak diingatkan)", () => {
    expect(onDay(1)).toBe("daily");
    expect(onDay(5)).toBe("daily");
    expect(onDay(5, { recordedToday: true })).toBeNull();
  });

  it("hari ke-14 sampai ke-17: pengingat posttest (prioritas), sampai posttest dikirim", () => {
    expect(onDay(13)).toBe("daily");
    expect(onDay(14)).toBe("posttest");
    expect(onDay(17, { recordedToday: true })).toBe("posttest");
    expect(onDay(14, { posttestSubmitted: true })).toBe("daily");
    expect(onDay(15, { posttestSubmitted: true })).toBeNull();
  });

  it("setelah masa tenggang dan di luar periode tidak ada pengingat", () => {
    expect(onDay(18)).toBeNull();
    expect(onDay(30)).toBeNull();
  });

  it("isi notifikasi netral: tanpa label risiko/diagnosis", () => {
    for (const m of Object.values(REMINDER_MESSAGES)) {
      expect(m.body).not.toMatch(/berisiko|prediabetes|diabetes|bahaya/i);
      expect(m.url.startsWith("/")).toBe(true);
    }
  });
});
