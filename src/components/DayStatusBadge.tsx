import type { DayState } from "@/server/modules/study/series";

/** Terisi / Nol / Belum diisi selalu dibedakan (BR-02). */
export function DayStatusBadge({ state }: { state: DayState }) {
  if (state === "filled") return <span className="status-badge st-filled">✓ Sudah diisi</span>;
  if (state === "zero") return <span className="status-badge st-zero">0 Nol (tidak minum)</span>;
  return <span className="status-badge st-empty">Belum diisi</span>;
}
