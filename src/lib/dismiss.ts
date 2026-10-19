/**
 * "Nanti saja" untuk kartu ajakan di sisi responden (pasang aplikasi, pengingat).
 * Disimpan di localStorage dan dihapus saat responden login lagi, sehingga kartu muncul
 * kembali di sesi berikutnya. Penyimpanan bisa diblokir browser: gagal = kartu tetap tampil.
 */
const KEYS = {
  install: "pm-install-dismissed",
  reminder: "pm-reminder-dismissed",
  /** Aplikasi sudah dipasang dari perangkat ini: permanen, tidak direset saat login. */
  installed: "pm-app-installed",
} as const;
export type DismissKey = keyof typeof KEYS;

export function isDismissed(key: DismissKey): boolean {
  try {
    return !!localStorage.getItem(KEYS[key]);
  } catch {
    return false;
  }
}

export function dismiss(key: DismissKey) {
  try {
    localStorage.setItem(KEYS[key], "1");
  } catch {
    // Penyimpanan diblokir: kartu hanya hilang sampai halaman dimuat ulang.
  }
}

/** Dipanggil setelah login berhasil. */
export function clearDismissals() {
  try {
    localStorage.removeItem(KEYS.install);
    localStorage.removeItem(KEYS.reminder);
  } catch {
    // abaikan
  }
}
