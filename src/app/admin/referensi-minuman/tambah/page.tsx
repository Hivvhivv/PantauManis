import type { Metadata } from "next";
import Link from "next/link";
import { staffForPage } from "@/server/auth/page-guards";
import { BeverageTypeForm } from "../BeverageTypeForm";

export const metadata: Metadata = { title: "Tambah Jenis Minuman" };

export default async function AddBeverageTypePage() {
  await staffForPage();
  return (
    <>
      <p className="small">
        <Link href="/admin/referensi-minuman">← Referensi Minuman</Link>
      </p>
      <h1>Tambah Jenis Minuman</h1>
      <BeverageTypeForm
        defaults={{
          name: "",
          icon: "🥤",
          defaultVolumeMl: "",
          sugarGPerServing: "",
          sugarLevelApplicable: true,
          source: "",
          needsVerification: false,
          isActive: true,
          sortOrder: 0,
        }}
      />
    </>
  );
}
