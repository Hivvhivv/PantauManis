import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CONTENT_TYPES, isMediaKey } from "./media";

/**
 * Penyimpanan media edukasi (ADR-008).
 * - "supabase": Supabase Storage lewat REST API, bucket publik, service role key hanya di server.
 * - "local" (default dev/test): folder lokal, disajikan oleh GET /api/media/[...key].
 */
interface MediaStorage {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  remove(key: string): Promise<void>;
  publicUrl(key: string): string;
}

function assertKey(key: string) {
  if (!isMediaKey(key)) throw new Error("Kunci media tidak valid");
}

function localDir(): string {
  return (
    process.env.PM_UPLOAD_DIR ??
    path.join(
      process.env.LOCALAPPDATA ?? path.join(os.homedir(), ".local", "share"),
      "pantaumanis",
      "uploads",
    )
  );
}

const localStorage: MediaStorage = {
  async put(key, bytes) {
    assertKey(key);
    const file = path.join(localDir(), key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
  },
  async remove(key) {
    assertKey(key);
    await rm(path.join(localDir(), key), { force: true });
  },
  publicUrl(key) {
    return `/api/media/${key}`;
  },
};

/** Membaca file lokal (hanya untuk driver lokal). */
export async function readLocal(
  key: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!isMediaKey(key)) return null;
  try {
    const bytes = await readFile(path.join(localDir(), key));
    return { bytes, contentType: CONTENT_TYPES[key.split(".").pop()!]! };
  } catch {
    return null;
  }
}

function supabaseStorage(): MediaStorage {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "edukasi";
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi untuk STORAGE_DRIVER=supabase",
    );
  }
  const headers = { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey };
  return {
    async put(key, bytes, contentType) {
      assertKey(key);
      const res = await fetch(`${url}/storage/v1/object/${bucket}/${key}`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": contentType,
          "x-upsert": "false",
          "cache-control": "31536000",
        },
        body: Buffer.from(bytes),
      });
      // Pesan dari Supabase tidak diteruskan ke pengguna; cukup status.
      if (!res.ok) throw new Error(`Unggah ke Supabase Storage gagal (HTTP ${res.status})`);
    },
    async remove(key) {
      assertKey(key);
      const res = await fetch(`${url}/storage/v1/object/${bucket}`, {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [key] }),
      });
      if (!res.ok) throw new Error(`Hapus di Supabase Storage gagal (HTTP ${res.status})`);
    },
    publicUrl(key) {
      return `${url}/storage/v1/object/public/${bucket}/${key}`;
    },
  };
}

export function storageDriver(): "local" | "supabase" {
  return process.env.STORAGE_DRIVER === "supabase" ? "supabase" : "local";
}

export function mediaStorage(): MediaStorage {
  return storageDriver() === "supabase" ? supabaseStorage() : localStorage;
}
