import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Disclaimer } from "@/components/Disclaimer";
import { resolveStaffSession } from "@/server/auth/sessions";
import { STAFF_COOKIE } from "@/server/http/cookies";
import { staffHomePath } from "@/server/modules/auth-service";
import { StaffLoginForm } from "./StaffLoginForm";

export const metadata: Metadata = { title: "Masuk Staf" };

export default async function StaffLoginPage() {
  const user = await resolveStaffSession((await cookies()).get(STAFF_COOKIE)?.value);
  if (user) redirect(staffHomePath(user));

  return (
    <main className="narrow stack">
      <div>
        <p className="brand">PantauManis</p>
        <h1>Masuk Staf</h1>
        <p className="muted">Khusus Admin dan Superadmin.</p>
      </div>
      <div className="card">
        <StaffLoginForm />
      </div>
      <Disclaimer />
    </main>
  );
}
