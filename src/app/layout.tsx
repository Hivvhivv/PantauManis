import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PantauManis", template: "%s · PantauManis" },
  description: "Pemantauan mandiri konsumsi minuman manis untuk penelitian.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
