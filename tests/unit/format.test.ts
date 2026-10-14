import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatPlainDate } from "@/lib/format";

describe("format waktu (simpan UTC, tampil Asia/Jakarta)", () => {
  it("menggeser ke WIB (UTC+7)", () => {
    // 2026-10-13 20:30 UTC = 14 Okt 2026 03.30 WIB
    const d = new Date("2026-10-13T20:30:00Z");
    expect(formatDate(d)).toBe("14 Okt 2026");
    expect(formatDateTime(d)).toMatch(/^14 Okt 2026.*03[.:]30 WIB$/);
  });

  it("tanggal tanpa jam tidak bergeser", () => {
    expect(formatPlainDate(new Date("2026-11-01T00:00:00Z"))).toBe("01 Nov 2026");
  });

  it("nilai kosong menjadi —", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });
});
