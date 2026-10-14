import type { Metadata } from "next";
import { staffForPage } from "@/server/auth/page-guards";
import { ImportForm } from "./ImportForm";

export const metadata: Metadata = { title: "Impor CSV" };

export default async function ImportPage() {
  await staffForPage();
  return (
    <>
      <h1>Impor Responden dari CSV</h1>
      <div className="card stack" style={{ maxWidth: 720 }}>
        <p>Berkas CSV dengan baris pertama berisi nama kolom:</p>
        <pre className="mono small" style={{ overflowX: "auto" }}>
          {
            "id_responden,inisial,tanggal_mulai,catatan\nR001,AB,2026-11-01,\nR002,,2026-11-01,Kelas pagi"
          }
        </pre>
        <ul className="small">
          <li>
            <strong>id_responden</strong> wajib dan unik; kolom lain opsional.
          </li>
          <li>Tanggal memakai format TTTT-BB-HH. Maksimal 500 baris.</li>
          <li>Jika ada satu baris yang salah, tidak ada data yang disimpan.</li>
          <li>Kode akses dibuat otomatis untuk setiap baris.</li>
        </ul>
      </div>
      <ImportForm />
    </>
  );
}
