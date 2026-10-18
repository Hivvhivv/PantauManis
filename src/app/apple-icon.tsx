import { ImageResponse } from "next/og";
import { AppIcon } from "./app-icon";

// Gambar tetap: dibuat sekali saat build, lalu disajikan dari cache CDN.
export const dynamic = "force-static";

/** Ikon "Tambah ke Layar Utama" di iPhone/iPad. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<AppIcon size={180} />, size);
}
