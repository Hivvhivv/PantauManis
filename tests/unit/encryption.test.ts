import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "@/server/crypto/encryption";

const KEY = Buffer.alloc(32, 3).toString("base64");

describe("AES-256-GCM", () => {
  it("bolak-balik dan memakai IV acak", () => {
    const a = encrypt("482915", KEY);
    const b = encrypt("482915", KEY);
    expect(a).toMatch(/^v1:/);
    expect(a).not.toBe(b);
    expect(decrypt(a, KEY)).toBe("482915");
  });

  it("tidak menyimpan teks asli", () => {
    expect(encrypt("482915", KEY)).not.toContain("482915");
  });

  it("menolak data yang diubah", () => {
    const [v, iv, tag, ct] = encrypt("482915", KEY).split(":");
    const tampered = Buffer.from(ct!, "base64");
    tampered[0] = tampered[0]! ^ 1;
    expect(() => decrypt([v, iv, tag, tampered.toString("base64")].join(":"), KEY)).toThrow();
  });

  it("menolak kunci yang salah", () => {
    expect(() => decrypt(encrypt("482915", KEY), Buffer.alloc(32, 4).toString("base64"))).toThrow();
  });
});
