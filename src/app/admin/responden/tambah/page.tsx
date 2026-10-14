import type { Metadata } from "next";
import { staffForPage } from "@/server/auth/page-guards";
import { suggestNextLabel } from "@/server/modules/respondents/service";
import { AddRespondentForm } from "./AddRespondentForm";

export const metadata: Metadata = { title: "Tambah Responden" };

export default async function AddRespondentPage() {
  await staffForPage();
  return (
    <>
      <h1>Tambah Responden</h1>
      <AddRespondentForm nextLabel={await suggestNextLabel()} />
    </>
  );
}
