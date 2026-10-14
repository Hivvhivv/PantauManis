/** Enkripsi AES-256-GCM untuk kode akses yang perlu ditampilkan ulang (ADR-004). */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";

export function encrypt(plaintext: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, "base64");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decrypt(payload: string, keyBase64: string): string {
  const [version, iv, tag, ciphertext] = payload.split(":");
  if (version !== VERSION || !iv || !tag || !ciphertext)
    throw new Error("Format data terenkripsi tidak dikenal");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(keyBase64, "base64"),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
