import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Disclaimer } from "@/components/Disclaimer";
import { DrinksIllustration } from "@/components/DrinksIllustration";
import { Logo } from "@/components/Logo";
import { resolveStaffSession } from "@/server/auth/sessions";
import { STAFF_COOKIE } from "@/server/http/cookies";
import { staffHomePath } from "@/server/modules/auth-service";
import { StaffLoginForm } from "./StaffLoginForm";

export const metadata: Metadata = { title: "Masuk Staf" };

export default async function StaffLoginPage() {
  const user = await resolveStaffSession((await cookies()).get(STAFF_COOKIE)?.value);
  if (user) redirect(staffHomePath(user));

  return (
    <main className="auth-page">
      <div className="auth-split">
        <section className="auth-brand">
          <Logo size={40} />
          <p className="tagline">Area tim peneliti</p>
          <p className="lead">
            Pantau kelengkapan data responden dan kelola kode akses penelitian.
          </p>
          <DrinksIllustration />
        </section>

        <div className="stack">
          <section className="auth-card stack">
            <div>
              <h1>Masuk Staf</h1>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Khusus Admin dan Superadmin tim peneliti.
              </p>
            </div>
            <StaffLoginForm />
            <div className="divider">atau</div>
            <p className="switch-link" style={{ margin: 0 }}>
              Responden? <Link href="/masuk">Kembali ke halaman masuk responden</Link>
            </p>
          </section>
          <Disclaimer />
        </div>
      </div>
    </main>
  );
}
