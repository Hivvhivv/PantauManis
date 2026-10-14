import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { resolveStaffSession } from "@/server/auth/sessions";
import { STAFF_COOKIE } from "@/server/http/cookies";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata: Metadata = { title: "Ganti Kata Sandi" };

export default async function ChangePasswordPage() {
  const user = await resolveStaffSession((await cookies()).get(STAFF_COOKIE)?.value);
  if (!user) redirect("/staf/masuk");

  return (
    <main className="narrow stack">
      <div className="row spread">
        <p className="brand">PantauManis</p>
        <LogoutButton kind="staff" />
      </div>
      <h1>Ganti Kata Sandi</h1>
      {user.mustChangePassword && (
        <p className="alert alert-warning">Anda wajib mengganti kata sandi sebelum melanjutkan.</p>
      )}
      <div className="card">
        <ChangePasswordForm />
      </div>
    </main>
  );
}
