"use client";

import { useEffect, useState } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void> };
const DISMISS_KEY = "pm-install-dismissed";

/**
 * Kartu "Pasang di HP" (PWA) dengan tombol Pasang yang selalu ada. Chrome baru mengirim
 * `beforeinstallprompt` setelah pengunjung berinteraksi beberapa saat (browser dalam aplikasi
 * seperti WhatsApp tidak pernah mengirimnya): bila event sudah datang, tombol membuka dialog
 * pasang bawaan; bila belum, tombol menampilkan langkah manual. Tidak tampil bila sudah
 * terpasang atau pernah ditutup.
 */
export function InstallCard() {
  const [mode, setMode] = useState<"hidden" | "prompt" | "ios" | "manual">("hidden");
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [showSteps, setShowSteps] = useState(false);

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
          Buka langsung dari layar utama seperti aplikasi, tanpa mengetik alamat.
        </p>
        {showSteps && (
          <ol className="small install-steps" aria-live="polite">
            {mode === "ios" ? (
              <>
                <li>
                  Ketuk tombol <strong>Bagikan</strong> ⬆ di bawah layar Safari.
                </li>
                <li>
                  Pilih <strong>Tambah ke Layar Utama</strong>, lalu <strong>Tambah</strong>.
                </li>
              </>
            ) : (
              <>
                <li>
                  Pastikan halaman ini dibuka di <strong>Chrome</strong> (bukan dari WhatsApp).
                </li>
                <li>
                  Ketuk menu <strong>⋮</strong> di kanan atas.
                </li>
                <li>
                  Pilih <strong>Tambahkan ke layar utama</strong> atau{" "}
                  <strong>Instal aplikasi</strong>.
                </li>
              </>
            )}
          </ol>
        )}
      </div>
      <div className="row">
        {/* Selalu ada: dialog pasang bawaan bila Chrome sudah siap, selain itu petunjuk manual. */}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          aria-expanded={prompt ? undefined : showSteps}
          onClick={async () => {
            if (prompt) {
              await prompt.prompt();
              setMode("hidden");
            } else {
              setShowSteps((s) => !s);
            }
          }}
        >
          Pasang
        </button>
        <button type="button" className="btn btn-sm" onClick={dismiss}>
          Nanti saja
        </button>
      </div>
    </section>
  );
}
