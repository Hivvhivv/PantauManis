// Service worker PantauManis: hanya untuk menerima pengingat (ADR-011).
// Sengaja TANPA handler "fetch": halaman, unduhan, dan sesi tidak pernah dicegat atau di-cache.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "PantauManis", body: "Jangan lupa catat minumanmu hari ini.", url: "/" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    // Payload kosong/tidak valid: pakai pesan bawaan.
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon/192",
      badge: "/icon/192",
      tag: "pantaumanis-pengingat",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Hanya alamat di situs ini yang boleh dibuka.
  const url = new URL(event.notification.data?.url || "/", self.location.origin);
  if (url.origin !== self.location.origin) return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url.href);
          return c.focus();
        }
      }
      return self.clients.openWindow(url.href);
    }),
  );
});
