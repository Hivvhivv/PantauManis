"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { dismiss, isDismissed } from "@/lib/dismiss";

type State = "loading" | "hidden" | "ios-install" | "denied" | "off";

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/**
 * Ajakan menyalakan pengingat harian (Web Push, ADR-011). Hanya tampil bila pengingat belum
 * aktif di perangkat ini; setelah dinyalakan kartu tidak tampil lagi, dan "Nanti saja"
 * menyembunyikannya sampai login berikutnya. Untuk berhenti, responden mencabut izin
 * notifikasi di pengaturan browser; langganan yang ditolak layanan push dihapus otomatis.
 * iPhone hanya mendukung bila aplikasi sudah dipasang di layar utama (iOS 16.4+).
 */
export function ReminderToggle({ vapidKey }: { vapidKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone;
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    const show = (s: State) => setState(isDismissed("reminder") ? "hidden" : s);
    if (!supported) return ios && !standalone ? show("ios-install") : setState("hidden");
    if (Notification.permission === "denied") return show("denied");
    currentSubscription()
      .then(async (s) => {
        if (!s) return show("off");
        setState("hidden");
        // Sinkron ulang ke server: langganan di browser bisa ada tanpa tercatat di server
        // (mis. koneksi putus saat menyalakan). Penyimpanan bersifat upsert, aman diulang.
        await api("/api/respondent/push", { body: s.toJSON() });
      })
      .catch(() => show("off"));
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
      await navigator.serviceWorker.register("/sw.js");
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes(vapidKey),
        }));
      const res = await api("/api/respondent/push", { body: sub.toJSON() });
      if (!res.ok) {
        await sub.unsubscribe();
        return setError(res.error.message);
      }
      setState("hidden");
    } catch {
      setError("Pengingat belum bisa dinyalakan di perangkat ini. Coba lagi nanti.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "hidden") return null;

  const close = () => {
    dismiss("reminder");
    setState("hidden");
  };

  return (
    <section className="install-card" aria-label="Pengingat harian">
      <span className="install-emoji" aria-hidden="true">
        🔔
      </span>
      <div>
        <strong>Pengingat harian</strong>
        <p className="small" style={{ margin: "0.15rem 0 0" }}>
          {state === "ios-install"
            ? "Di iPhone, pasang PantauManis di layar utama dulu (Bagikan ⬆ → Tambah ke Layar Utama), lalu buka dari ikonnya untuk menyalakan pengingat."
            : state === "denied"
              ? "Notifikasi diblokir di browser ini. Izinkan notifikasi untuk PantauManis di pengaturan browser bila ingin diingatkan."
              : "Dapat pengingat pukul 19.00 WIB bila hari itu kamu belum mencatat."}
        </p>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="row">
        {state === "off" && (
          <button type="button" className="btn btn-primary btn-sm" onClick={enable} disabled={busy}>
            Nyalakan pengingat
          </button>
        )}
        <button type="button" className="btn btn-sm" onClick={close}>
          Nanti saja
        </button>
      </div>
    </section>
  );
}
