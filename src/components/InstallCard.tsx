"use client";

import { useEffect, useState } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void> };
const DISMISS_KEY = "pm-install-dismissed";

/**
 * Kartu "Pasang di HP" (PWA). Selalu tampil dengan petunjuk manual, karena Chrome baru
 * mengirim `beforeinstallprompt` setelah pengunjung berinteraksi beberapa saat (dan browser
 * dalam aplikasi seperti WhatsApp tidak pernah mengirimnya). Begitu event itu datang,
 * tombol Pasang satu-ketuk ditampilkan. Tidak tampil bila sudah terpasang atau pernah ditutup.
 */
export function InstallCard() {
  const [mode, setMode] = useState<"hidden" | "prompt" | "ios" | "manual">("hidden");
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // Penyimpanan diblokir: tetap tampilkan kartu.
    }
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone;
    if (standalone) return;
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      setMode("ios");
      return;
    }
    setMode("manual");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
      setMode("prompt");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (mode === "hidden") return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // abaikan
    }
    setMode("hidden");
  };

  return (
    <section className="install-card" aria-label="Pasang PantauManis di HP">
      <span className="install-emoji" aria-hidden="true">
        📲
      </span>
      <div>
        <strong>Pasang PantauManis di HP</strong>
        <p className="small" style={{ margin: "0.15rem 0 0" }}>
          {mode === "ios" ? (
            <>
              Ketuk tombol <strong>Bagikan</strong> ⬆ di Safari, lalu pilih{" "}
              <strong>Tambah ke Layar Utama</strong>.
            </>
          ) : mode === "prompt" ? (
            "Buka langsung dari layar utama seperti aplikasi, tanpa mengetik alamat."
          ) : (
            <>
              Buka di <strong>Chrome</strong>, ketuk menu <strong>⋮</strong>, lalu pilih{" "}
              <strong>Tambahkan ke layar utama</strong> atau <strong>Instal aplikasi</strong>.
            </>
          )}
        </p>
      </div>
      <div className="row">
        {mode === "prompt" && prompt && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={async () => {
              await prompt.prompt();
              setMode("hidden");
            }}
          >
            Pasang
          </button>
        )}
        <button type="button" className="btn btn-sm" onClick={dismiss}>
          Nanti saja
        </button>
      </div>
    </section>
  );
}
