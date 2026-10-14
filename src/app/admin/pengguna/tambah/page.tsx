import type { Metadata } from "next";
import { superadminForPage } from "@/server/auth/page-guards";
import { suggestNextLabel } from "@/server/modules/respondents/service";
import { CreateUserForm } from "./CreateUserForm";

export const metadata: Metadata = { title: "Tambah Pengguna" };

export default async function CreateUserPage() {
  await superadminForPage();
  return (
    <>
      <h1>Tambah Pengguna</h1>
      <CreateUserForm nextLabel={await suggestNextLabel()} />
    </>
  );
}
