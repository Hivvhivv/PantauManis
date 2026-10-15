import type { MetadataRoute } from "next";

/** PWA: PantauManis bisa dipasang di layar utama HP dan dibuka tanpa bilah alamat browser. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PantauManis",
    short_name: "PantauManis",
    description: "Catat dan pantau konsumsi minuman manis harianmu.",
    lang: "id",
    start_url: "/beranda",
    scope: "/",
    display: "standalone",
    background_color: "#fbf6ee",
    theme_color: "#9c5b2e",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
