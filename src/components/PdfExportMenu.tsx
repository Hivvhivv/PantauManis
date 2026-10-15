import { PDF_SECTIONS, type PdfSection } from "@/lib/pdf-sections";

/**
 * Tombol "Ekspor PDF" yang membuka pilihan bagian (checkbox). PDF dibuka di tab baru;
 * data baru dimuat saat form dikirim (ADR-006) dan setiap PDF dicatat di log audit (ADR-009).
 * Tanpa JavaScript: <details> + form GET biasa.
 */
export function PdfExportMenu({
  action,
  sections,
  xlsx,
}: {
  action: string;
  sections: readonly PdfSection[];
  /** Data mentah untuk analisis statistik (ADR-007). */
  xlsx: { href: string; label: string };
}) {
  return (
    <details className="export-menu">
      <summary className="btn btn-primary">Ekspor PDF</summary>
      <form method="get" action={action} target="_blank" className="card stack export-panel">
        <fieldset className="check-list">
          <legend>Bagian yang dimasukkan ke PDF</legend>
          {sections.map((s) => (
            <label key={s}>
              <input type="checkbox" name="b" value={s} defaultChecked />
              {PDF_SECTIONS[s]}
            </label>
          ))}
        </fieldset>
        <p className="small muted" style={{ margin: 0 }}>
          PDF memuat nama responden. Setiap ekspor dicatat di log audit.
        </p>
        <div className="row">
          <button className="btn btn-primary" type="submit">
            Buat PDF
          </button>
          <a className="btn" href={xlsx.href} download>
            {xlsx.label}
          </a>
        </div>
      </form>
    </details>
  );
}
