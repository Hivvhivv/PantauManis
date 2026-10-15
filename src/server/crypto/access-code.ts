/**
 * Kode akses responden (ADR-004): PM- + 6 digit acak, tanpa pola yang mudah ditebak.
 * Modul ini murni (tanpa I/O) agar mudah diuji.
 */
import { createHmac, randomInt } from "node:crypto";

const CODE_LENGTH = 6;
const CODE_PREFIX = "PM-";

/** true jika kode mudah ditebak: digit sama, urut, berulang, atau cerminan. */
export function isPatterned(digits: string): boolean {
  const d = [...digits].map(Number);
  const allSame = d.every((x) => x === d[0]);
  const step = (dir: 1 | -1) => d.every((x, i) => i === 0 || x === (d[i - 1]! + dir + 10) % 10);
  const period = (p: number) => d.every((x, i) => x === d[i % p]);
  const mirror = digits === [...digits].reverse().join("");
  return allSame || step(1) || step(-1) || period(2) || period(3) || mirror;
}

/** Membuat 6 digit acak kriptografis yang tidak berpola. */
export function generateAccessCode(): string {
  for (;;) {
    let digits = "";
    for (let i = 0; i < CODE_LENGTH; i++) digits += String(randomInt(0, 10));
    if (!isPatterned(digits)) return digits;
  }
}

/**
 * Menormalkan input pengguna menjadi 6 digit, atau null jika formatnya salah.
 * PM- opsional; spasi, strip, dan huruf kecil diterima.
 */
export function normalizeAccessCodeInput(input: string): string | null {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const digits = cleaned.startsWith("PM") ? cleaned.slice(2) : cleaned;
  return /^\d{6}$/.test(digits) ? digits : null;
}

/** PM-482915 (format kanonis). */
export function formatAccessCode(digits: string): string {
  return `${CODE_PREFIX}${digits}`;
}

/** PM-482-915 (untuk kartu kode dan tampilan agar mudah dibaca). */
export function formatAccessCodeForCard(digits: string): string {
  return `${CODE_PREFIX}${digits.slice(0, 3)}-${digits.slice(3)}`;
}

/** PM-48•••• (untuk list dan detail). */
export function maskAccessCode(digits: string): string {
  return `${CODE_PREFIX}${digits.slice(0, 2)}${"•".repeat(CODE_LENGTH - 2)}`;
}

/** HMAC-SHA256 (hex) atas 6 digit, dengan secret dari environment. */
export function hmacAccessCode(digits: string, secretBase64: string): string {
  return createHmac("sha256", Buffer.from(secretBase64, "base64"))
    .update(`code:${digits}`)
    .digest("hex");
}
