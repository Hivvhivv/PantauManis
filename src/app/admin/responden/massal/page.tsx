import type { Metadata } from "next";
import { staffForPage } from "@/server/auth/page-guards";
import { BulkCreateForm } from "./BulkCreateForm";

export const metadata: Metadata = { title: "Buat Kode Massal" };

export default async function BulkCreatePage() {
  await staffForPage();
  return (
    <>
      <h1>Buat Kode Massal</h1>
      <p className="muted">
        Membuat beberapa responden sekaligus dengan ID berurutan, misalnya R001–R050.
      </p>
      <BulkCreateForm />
    </>
  );
}
