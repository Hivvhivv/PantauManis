"use client";

import { useEffect } from "react";

/**
 * Bilah atas laporan PDF. Dialog cetak dibuka otomatis setelah grafik selesai digambar;
 * pilih "Simpan sebagai PDF" di dialog tersebut. Bilah ini tidak ikut tercetak.
 */
export function ReportToolbar() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 1500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="no-print card row spread">
      <span className="small">
        Pilih <strong>Simpan sebagai PDF</strong> di dialog cetak.
      </span>
      <button type="button" className="btn btn-primary" onClick={() => window.print()}>
        Unduh PDF
      </button>
    </div>
  );
}
