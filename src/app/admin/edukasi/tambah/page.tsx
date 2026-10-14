import type { Metadata } from "next";
import Link from "next/link";
import { staffForPage } from "@/server/auth/page-guards";
import { MaterialForm } from "../MaterialForm";

export const metadata: Metadata = { title: "Tambah Materi" };

export default async function AddMaterialPage() {
  await staffForPage();
  return (
    <>
      <p className="small" style={{ margin: 0 }}>
        <Link href="/admin/edukasi">← Materi Edukasi</Link>
      </p>
      <h1 style={{ margin: 0 }}>Tambah Materi</h1>
      <MaterialForm
        defaults={{
          title: "",
          summary: "",
          body: "",
          icon: "📘",
          imageKey: null,
          imageUrl: null,
          imageAlt: null,
          videoUrl: null,
          source: null,
          unlockDay: null,
          status: "draft",
          questions: [],
        }}
      />
    </>
  );
}
