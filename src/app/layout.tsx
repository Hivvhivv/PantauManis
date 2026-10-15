import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  title: { default: "PantauManis", template: "%s · PantauManis" },
  description: "Pemantauan mandiri konsumsi minuman manis untuk penelitian.",
  robots: { index: false, follow: false },
  // iPhone: dibuka layar penuh setelah "Tambah ke Layar Utama" (PWA, manifest.ts).
  appleWebApp: { capable: true, title: "PantauManis", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#9c5b2e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={nunito.variable}>
      <body>{children}</body>
    </html>
  );
}
