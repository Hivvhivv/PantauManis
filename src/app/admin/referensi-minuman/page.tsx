import type { Metadata } from "next";
import Link from "next/link";
import { staffForPage } from "@/server/auth/page-guards";
import { listBeverageTypes } from "@/server/modules/beverages/service";

export const metadata: Metadata = { title: "Referensi Minuman" };

export default async function BeverageTypesPage() {
  await staffForPage();
  const items = await listBeverageTypes();
  const unverified = items.filter((b) => b.needsVerification && b.isActive).length;

  return (
    <>
      <div className="row spread">
        <h1 style={{ margin: 0 }}>Referensi Minuman</h1>
        <Link className="btn btn-primary" href="/admin/referensi-minuman/tambah">
          Tambah jenis minuman
        </Link>
      </div>
      <p className="muted">
        Nilai ini dipakai untuk menghitung perkiraan gula saat responden mencatat. Mengubah nilai
        tidak mengubah catatan yang sudah ada.
      </p>
      {unverified > 0 && (
        <p className="alert alert-warning" role="status">
          {unverified} jenis minuman aktif masih memakai nilai contoh. Ganti dengan nilai bersumber
          jelas sebelum penelitian dimulai, lalu hilangkan tanda &quot;perlu diverifikasi&quot;.
        </p>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Jenis minuman</th>
              <th scope="col">Sajian standar</th>
              <th scope="col">Perkiraan gula / sajian</th>
              <th scope="col">Tingkat gula</th>
              <th scope="col">Sumber</th>
              <th scope="col">Status</th>
              <th scope="col">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id}>
                <td>
                  <span aria-hidden="true">{b.icon}</span> {b.name}
                </td>
                <td>{b.defaultVolumeMl} ml</td>
                <td>{b.sugarGPerServing} g</td>
                <td>{b.sugarLevelApplicable ? "Bisa dipilih" : "—"}</td>
                <td className="small">
                  {b.source ?? "—"}
                  {b.needsVerification && (
                    <div>
                      <span className="badge badge-inactive">Perlu diverifikasi</span>
                    </div>
                  )}
                </td>
                <td>
                  <span className={`badge ${b.isActive ? "badge-active" : "badge-inactive"}`}>
                    {b.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td>
                  <Link className="btn btn-sm" href={`/admin/referensi-minuman/${b.id}`}>
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
