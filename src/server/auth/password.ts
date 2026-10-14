import { hash, verify } from "@node-rs/argon2";

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

// Hash tiruan agar waktu respons sama ketika email tidak ditemukan.
let dummyHash: Promise<string> | undefined;
export function verifyDummy(password: string): Promise<boolean> {
  dummyHash ??= hash("dummy-password-for-timing");
  return dummyHash.then((h) => verifyPassword(h, password)).then(() => false);
}
