import "server-only";
import { z } from "zod";

const base64Key = (minBytes: number, exactBytes?: number) =>
  z.string().refine(
    (v) => {
      const len = Buffer.from(v, "base64").length;
      return exactBytes ? len === exactBytes : len >= minBytes;
    },
    {
      message: exactBytes
        ? `harus ${exactBytes} byte (base64)`
        : `minimal ${minBytes} byte (base64)`,
    },
  );

const schema = z
  .object({
    DATABASE_URL: z.string().min(1),
    APP_URL: z.url(),
    ACCESS_CODE_HMAC_SECRET: base64Key(32),
    ACCESS_CODE_ENC_KEY: base64Key(32, 32),
  })
  .refine((e) => e.ACCESS_CODE_HMAC_SECRET !== e.ACCESS_CODE_ENC_KEY, {
    message: "ACCESS_CODE_HMAC_SECRET dan ACCESS_CODE_ENC_KEY harus berbeda",
  });

type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Membaca dan memvalidasi environment variable. Nilai rahasia tidak pernah ikut di pesan error. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const names = parsed.error.issues.map((i) => i.path.join(".") || i.message).join(", ");
    throw new Error(`Environment variable tidak valid: ${names}`);
  }
  cached = parsed.data;
  return cached;
}
