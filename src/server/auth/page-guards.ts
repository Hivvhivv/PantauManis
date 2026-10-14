import "server-only";
import { cookies, headers } from "next/headers";
import type { Actor } from "@/server/modules/audit";
import { forbidden, redirect } from "next/navigation";
import { RESPONDENT_COOKIE, STAFF_COOKIE } from "@/server/http/cookies";
import { resolveRespondentSession, resolveStaffSession } from "./sessions";

/** Guard halaman staf. Pemeriksaan sesungguhnya tetap ada di setiap API (requireStaff). */
export async function staffForPage() {
  const user = await resolveStaffSession((await cookies()).get(STAFF_COOKIE)?.value);
  if (!user) redirect("/staf/masuk");
  if (user.mustChangePassword) redirect("/staf/ganti-kata-sandi");
  return user;
}

/** Halaman khusus Superadmin: Admin mendapat 403 (AC-06). */
export async function superadminForPage() {
  const user = await staffForPage();
  if (user.role !== "superadmin") forbidden();
  return user;
}

/** Pelaku untuk audit log dari halaman server (IP diambil dari header request). */
export async function pageActor(user: { id: string }): Promise<Actor> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return { type: "staff", id: user.id, ip: ip.slice(0, 64) };
}

export async function respondentForPage() {
  const r = await resolveRespondentSession((await cookies()).get(RESPONDENT_COOKIE)?.value);
  if (!r) redirect("/masuk");
  return r;
}
