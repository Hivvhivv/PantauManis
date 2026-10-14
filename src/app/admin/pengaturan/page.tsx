import type { Metadata } from "next";
import { superadminForPage } from "@/server/auth/page-guards";
import { getSettingsForm } from "@/server/modules/study/settings-admin";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Pengaturan Penelitian" };

/** Pengaturan Penelitian (FR-S-04), khusus Superadmin. */
export default async function SettingsPage() {
  await superadminForPage();
  return (
    <>
      <h1 style={{ margin: 0 }}>Pengaturan Penelitian</h1>
      <p className="muted" style={{ margin: 0 }}>
        Zona waktu penelitian tetap Asia/Jakarta (WIB). Perubahan dicatat di log audit.
      </p>
      <SettingsForm initial={await getSettingsForm()} />
    </>
  );
}
