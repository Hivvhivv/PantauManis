import { ImageResponse } from "next/og";
import { AppIcon } from "./app-icon";

// Gambar tetap: dibuat sekali saat build, lalu disajikan dari cache CDN.
export const dynamic = "force-static";

/** Ikon PNG 192 & 512 px untuk manifest PWA dan favicon: /icon/192, /icon/512. */
export function generateImageMetadata() {
  return [192, 512].map((s) => ({
    id: String(s),
    size: { width: s, height: s },
    contentType: "image/png",
  }));
}

export default function Icon({ id }: { id: string }) {
  const s = Number(id);
  return new ImageResponse(<AppIcon size={s} />, { width: s, height: s });
}
