import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Disclaimer } from "@/components/Disclaimer";
import { resolveRespondentSession } from "@/server/auth/sessions";
import { RESPONDENT_COOKIE } from "@/server/http/cookies";
import { respondentHomePath } from "@/server/modules/auth-service";
import { RespondentLoginForm } from "./RespondentLoginForm";

export const metadata: Metadata = { title: "Masuk" };

export default async function MasukPage() {
  const r = await resolveRespondentSession((await cookies()).get(RESPONDENT_COOKIE)?.value);
  if (r) redirect(respondentHomePath(r));

  return (
    <main className="narrow stack">
      <div>
        <p className="brand">PantauManis</p>
        <h1>Masuk dengan Kode Akses</h1>
        <p className="muted">Masukkan kode akses yang Anda terima dari tim peneliti.</p>
      </div>
      <div className="card">
        <RespondentLoginForm />
      </div>
      <Disclaimer />
      <p className="small muted">
        Tim peneliti? <Link href="/staf/masuk">Masuk sebagai staf</Link>
      </p>
    </main>
  );
}
