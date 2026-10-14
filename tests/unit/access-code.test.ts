import { describe, expect, it } from "vitest";
import {
  formatAccessCode,
  formatAccessCodeForCard,
  generateAccessCode,
  hmacAccessCode,
  isPatterned,
  maskAccessCode,
  normalizeAccessCodeInput,
} from "@/server/crypto/access-code";

const SECRET = Buffer.alloc(32, 7).toString("base64");

describe("generateAccessCode", () => {
  it("menghasilkan tepat 6 digit", () => {
    for (let i = 0; i < 500; i++) expect(generateAccessCode()).toMatch(/^\d{6}$/);
  });

  it("tidak pernah menghasilkan kode berpola", () => {
    for (let i = 0; i < 2000; i++) expect(isPatterned(generateAccessCode())).toBe(false);
  });

  it("acak (bukan berurutan): 1000 kode hampir semuanya berbeda", () => {
    const codes = new Set(Array.from({ length: 1000 }, generateAccessCode));
    expect(codes.size).toBeGreaterThan(990);
  });
});

describe("isPatterned", () => {
  it.each([
    "111111",
    "000000",
    "123456",
    "654321",
    "012345",
    "890123",
    "098765",
    "121212",
    "123123",
    "123321",
    "455554",
  ])("menolak %s", (c) => expect(isPatterned(c)).toBe(true));

  it.each(["482915", "730164", "905827"])("menerima %s", (c) => expect(isPatterned(c)).toBe(false));
});

describe("normalizeAccessCodeInput", () => {
  it.each([
    ["PM-482915", "482915"],
    ["pm-482-915", "482915"],
    ["PM 482 915", "482915"],
    ["482915", "482915"],
    ["482-915", "482915"],
    ["  pm482915  ", "482915"],
    ["Pm–482.915", "482915"],
  ])("%s → %s", (input, out) => expect(normalizeAccessCodeInput(input)).toBe(out));

  it.each(["", "PM-", "48291", "4829150", "PM-48291A", "ABCDEF", "QM-482915"])(
    "menolak %s",
    (input) => expect(normalizeAccessCodeInput(input)).toBeNull(),
  );
});

describe("format kode", () => {
  it("kanonis, kartu, dan samaran", () => {
    expect(formatAccessCode("482915")).toBe("PM-482915");
    expect(formatAccessCodeForCard("482915")).toBe("PM-482-915");
    expect(maskAccessCode("482915")).toBe("PM-48••••");
  });
});

describe("hmacAccessCode", () => {
  it("deterministik dan bergantung pada secret", () => {
    const a = hmacAccessCode("482915", SECRET);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(hmacAccessCode("482915", SECRET)).toBe(a);
    expect(hmacAccessCode("482916", SECRET)).not.toBe(a);
    expect(hmacAccessCode("482915", Buffer.alloc(32, 8).toString("base64"))).not.toBe(a);
  });
});
