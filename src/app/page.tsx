import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveRespondentSession, resolveStaffSession } from "@/server/auth/sessions";
import { RESPONDENT_COOKIE, STAFF_COOKIE } from "@/server/http/cookies";
import { respondentHomePath, staffHomePath } from "@/server/modules/auth-service";

/**
 * Titik awal aplikasi (juga start_url PWA): sesi yang masih berlaku langsung diarahkan ke
 * halamannya, sehingga membuka ulang aplikasi tidak meminta login lagi. Tanpa sesi → Masuk.
 */
export default async function Home() {
  const jar = await cookies();
  const respondent = await resolveRespondentSession(jar.get(RESPONDENT_COOKIE)?.value);
  if (respondent) redirect(respondentHomePath(respondent));
  const staff = await resolveStaffSession(jar.get(STAFF_COOKIE)?.value);
  if (staff) redirect(staffHomePath(staff));
  redirect("/masuk");
}
