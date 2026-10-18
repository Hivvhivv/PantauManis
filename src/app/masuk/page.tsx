import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Disclaimer } from "@/components/Disclaimer";
import { DrinksIllustration } from "@/components/DrinksIllustration";
import { InstallCard } from "@/components/InstallCard";
import { Logo } from "@/components/Logo";
import { resolveRespondentSession } from "@/server/auth/sessions";
import { RESPONDENT_COOKIE } from "@/server/http/cookies";
import { respondentHomePath } from "@/server/modules/auth-service";
import { getStudySettings } from "@/server/modules/study/settings";
import { RespondentLoginForm } from "./RespondentLoginForm";

export const metadata: Metadata = { title: "Masuk" };

export default async function MasukPage() {
  const r = await resolveRespondentSession((await cookies()).get(RESPONDENT_COOKIE)?.value);
  if (r) redirect(respondentHomePath(r));
  const { contactText } = await getStudySettings();

  return (
    <main className="auth-page">
      <div className="auth-split">
        <section className="auth-brand">
          <Logo size={40} />
          <p className="tagline">Langkah kecil, kebiasaan baru</p>
          <p className="lead">
            Catat minuman manismu setiap hari dan lihat perkembanganmu sendiri, pelan-pelan saja.
          </p>
          <DrinksIllustration />
        </section>

        <div className="stack">
          <section className="auth-card stack">
            <div>
              <h1>Selamat datang!</h1>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Masukkan kode akses yang kamu terima dari tim peneliti.
              </p>
            </div>
            <RespondentLoginForm />
            <p className="small muted help-contact" style={{ margin: 0 }}>
              Lupa kode akses?{" "}
              {contactText ? (
                <>
                  Hubungi tim peneliti: <strong>{contactText}</strong>
                </>
              ) : (
                "Hubungi tim peneliti yang memberimu kartu kode."
              )}
            </p>
            <div className="divider">atau</div>
            <p className="switch-link" style={{ margin: 0 }}>
              Tim peneliti? <Link href="/staf/masuk">Masuk sebagai staf</Link>
            </p>
          </section>
          <InstallCard />
          <Disclaimer />
        </div>
      </div>
    </main>
  );
}
