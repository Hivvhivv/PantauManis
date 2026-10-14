import type { Metadata } from "next";
import Link from "next/link";
import { staffForPage } from "@/server/auth/page-guards";
import { listMaterialsAdmin } from "@/server/modules/education/service";
import { SortableMaterials } from "./SortableMaterials";

export const metadata: Metadata = { title: "Materi Edukasi" };

export default async function EducationAdminPage() {
  await staffForPage();
  const items = await listMaterialsAdmin();
  return (
    <>
      <div className="row spread">
        <h1 style={{ margin: 0 }}>Materi Edukasi</h1>
        <Link className="btn btn-primary" href="/admin/edukasi/tambah">
          Tambah materi
        </Link>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Seret untuk mengubah urutan (atau pakai tombol ↑/↓), lalu simpan. Hanya materi berstatus
        Terbit yang terlihat oleh responden.
      </p>
      {items.length === 0 ? (
        <p className="card muted">Belum ada materi.</p>
      ) : (
        <SortableMaterials
          items={items.map((i) => ({ ...i, updatedAt: i.updatedAt.toISOString() }))}
        />
      )}
    </>
  );
}
