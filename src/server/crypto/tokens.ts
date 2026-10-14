import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";

/** Token sesi acak 256-bit (base64url). Hanya hash-nya yang disimpan di basis data. */
export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** HMAC email untuk rate limit, supaya tabel login_attempts tidak menyimpan email asli. */
export function hmacEmail(email: string, secretBase64: string): string {
  return createHmac("sha256", Buffer.from(secretBase64, "base64"))
    .update(`email:${email}`)
    .digest("hex");
}

const PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

/** Kata sandi sementara (12 karakter, tanpa karakter yang mudah tertukar). */
export function temporaryPassword(length = 12): string {
  let out = "";
  for (let i = 0; i < length; i++) out += PASSWORD_ALPHABET[randomInt(0, PASSWORD_ALPHABET.length)];
  return out;
}
