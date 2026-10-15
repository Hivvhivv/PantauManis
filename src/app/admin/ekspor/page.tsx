import type { Metadata } from "next";
import { staffForPage } from "@/server/auth/page-guards";
import { DATASET_TITLES, DATASETS } from "@/server/modules/export/service";
import { reportOptions } from "@/server/modules/respondents/service";

export const metadata: Metadata = { title: "Ekspor Data" };

const NOTES: Record<(typeof DATASETS)[number], string> = {
  responden: "Status, tanggal persetujuan/pretest/posttest, kelengkapan, target aktif.",
  log_konsumsi: "Semua catatan; kolom di_luar_periode = 1 untuk catatan setelah hari ke-14.",
  ringkasan_harian: "Tepat 14 baris per responden: terisi / nol / belum_diisi (kosong, bukan 0).",
  kuesioner: "Jawaban berupa kode angka + skor; arti kode ada di sheet Codebook (XLSX).",
  target: "Riwayat target beserta periode berlakunya.",
  edukasi: "Materi yang dibaca dan skor kuis pertama/terakhir.",
};

/** Ekspor data penelitian (FR-A-07). Setiap unduhan dicatat di log audit. */
export default async function ExportPage() {
  await staffForPage();
  const people = await reportOptions();
  return (
    <>
      <h1 style={{ margin: 0 }}>Ekspor Data</h1>
      <p className="muted" style={{ margin: 0 }}>
        File memakai <strong>ID Responden</strong>, bukan kode akses. Responden yang dihapus tidak
        ikut. Waktu dalam ISO 8601 WIB (+07:00). CSV memakai pemisah koma (untuk R/SPSS/Python);
        untuk Excel gunakan XLSX. Setiap unduhan dicatat di log audit.
      </p>

      <section className="card export-all">
        <div>
          <h2 style={{ margin: 0 }}>Semua dataset</h2>
          <p className="small muted" style={{ margin: "0.25rem 0 0" }}>
            Satu file XLSX berisi 6 sheet + Codebook (arti setiap kolom dan kode jawaban).
          </p>
        </div>
        <a className="btn btn-primary" href="/api/admin/export/semua?format=xlsx" download>
          Unduh semua (XLSX)
        </a>
      </section>

      <form className="card export-all" method="get" action="/admin/ekspor/pdf" target="_blank">
        <div>
          <h2 style={{ margin: 0 }}>Laporan PDF</h2>
          <p className="small muted" style={{ margin: "0.25rem 0 0" }}>
            Grafik dan ringkasan hasil, termasuk nama responden. Simpan dan bagikan dengan
            hati-hati.
          </p>
          <label htmlFor="pdf-r" style={{ marginTop: "0.75rem" }}>
            Isi laporan
          </label>
          <select id="pdf-r" name="r" defaultValue="semua">
            <option value="semua">Keseluruhan (semua responden)</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
                {p.fullName ? ` – ${p.fullName}` : ""}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" type="submit">
          Unduh PDF
        </button>
      </form>

      <ul className="export-list">
        {DATASETS.map((d) => (
          <li key={d} className="card">
            <div>
              <h2 style={{ margin: 0, fontSize: "1.05rem" }}>{DATASET_TITLES[d]}</h2>
              <p className="small muted" style={{ margin: "0.25rem 0 0" }}>
                {NOTES[d]}
              </p>
            </div>
            <div className="row">
              <a className="btn btn-sm" href={`/api/admin/export/${d}?format=csv`} download>
                CSV
              </a>
              <a className="btn btn-sm" href={`/api/admin/export/${d}?format=xlsx`} download>
                XLSX
              </a>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
