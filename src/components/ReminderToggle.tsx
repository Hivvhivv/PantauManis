"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

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
 * Pengingat harian lewat Web Push (ADR-011): dinyalakan sendiri oleh responden, bisa dimatikan
 * kapan saja. iPhone hanya mendukung bila aplikasi sudah dipasang di layar utama (iOS 16.4+).
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
    if (!supported) return setState(ios && !standalone ? "ios-install" : "unsupported");
    if (Notification.permission === "denied") return setState("denied");
    currentSubscription()
      .then((s) => setState(s ? "on" : "off"))
      .catch(() => setState("off"));
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
      setState("on");
    } catch {
      setError("Pengingat belum bisa dinyalakan di perangkat ini. Coba lagi nanti.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const sub = await currentSubscription();
      if (sub) {
        await api("/api/respondent/push", { method: "DELETE", body: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  return (
    <section className="install-card" aria-label="Pengingat harian">
      <span className="install-emoji" aria-hidden="true">
        🔔
      </span>
      <div>
        <strong>Pengingat harian {state === "on" && "aktif"}</strong>
        <p className="small" style={{ margin: "0.15rem 0 0" }}>
          {state === "ios-install"
            ? "Di iPhone, pasang PantauManis di layar utama dulu (Bagikan ⬆ → Tambah ke Layar Utama), lalu buka dari ikonnya untuk menyalakan pengingat."
            : state === "denied"
              ? "Notifikasi diblokir di browser ini. Izinkan notifikasi untuk PantauManis di pengaturan browser bila ingin diingatkan."
              : state === "on"
                ? "Kami mengingatkan pukul 19.00 WIB bila hari itu kamu belum mencatat."
                : "Dapat pengingat pukul 19.00 WIB bila hari itu kamu belum mencatat."}
        </p>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
      {(state === "off" || state === "on") && (
        <div className="row">
          {state === "off" ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={enable}
              disabled={busy}
            >
              Nyalakan pengingat
            </button>
          ) : (
            <button type="button" className="btn btn-sm" onClick={disable} disabled={busy}>
              Matikan
            </button>
          )}
        </div>
      )}
    </section>
  );
}
