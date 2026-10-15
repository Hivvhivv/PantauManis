/** Validasi file gambar unggahan (ADR-008). Modul murni. */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type ImageType = { ext: "jpg" | "png" | "webp"; contentType: string };

/** Tipe gambar dari isi file (magic bytes), bukan dari nama atau Content-Type kiriman browser. */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  const b = (i: number) => bytes[i];
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff)
    return { ext: "jpg", contentType: "image/jpeg" };
  if (
    b(0) === 0x89 &&
    b(1) === 0x50 &&
    b(2) === 0x4e &&
    b(3) === 0x47 &&
    b(4) === 0x0d &&
    b(5) === 0x0a &&
    b(6) === 0x1a &&
    b(7) === 0x0a
  ) {
    return { ext: "png", contentType: "image/png" };
  }
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return { ext: "webp", contentType: "image/webp" };
  }
  return null;
}

/** Kunci file yang sah: edukasi/<uuid>.<ext>. Mencegah path traversal. */
const MEDIA_KEY_RE =
  /^edukasi\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

export function isMediaKey(key: string): boolean {
  return MEDIA_KEY_RE.test(key);
}

export const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
