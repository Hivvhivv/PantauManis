import { NextRequest } from "next/server";
import { hashPassword } from "@/server/auth/password";
import { createRespondentSession, createStaffSession } from "@/server/auth/sessions";
import { prisma } from "@/server/db";
import { RESPONDENT_COOKIE, STAFF_COOKIE } from "@/server/http/cookies";
import { createRespondent } from "@/server/modules/respondents/service";
import { addDays, localDateOf, toDbDate } from "@/server/modules/study/days";

type Handler = (req: NextRequest, ctx: { params: Promise<never> }) => Promise<Response>;

/** Memanggil Route Handler langsung, tanpa server HTTP. */
export async function call(
  handler: unknown,
  opts: {
    method?: string;
    url?: string;
    body?: unknown;
    cookie?: string;
    params?: Record<string, string | string[]>;
    headers?: Record<string, string>;
    form?: FormData;
  } = {},
) {
  const headers = new Headers(opts.headers);
  headers.set("x-forwarded-for", headers.get("x-forwarded-for") ?? "10.0.0.1");
  if (opts.cookie) headers.set("cookie", opts.cookie);
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(opts.body);
  }
  const req = new NextRequest(new URL(opts.url ?? "/api/test", "http://localhost:3000"), {
    method: opts.method ?? (body ? "POST" : "GET"),
    headers,
    body,
  });
  const res = await (handler as Handler)(req, {
    params: Promise.resolve(opts.params ?? {}) as Promise<never>,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- bentuk respons berbeda tiap endpoint
  return { status: res.status, json: json as Record<string, any>, text, headers: res.headers };
}

export const TEST_PASSWORD = "kata-sandi-uji-123";

export async function makeStaff(
  role: "admin" | "superadmin",
  overrides: { email?: string; mustChangePassword?: boolean } = {},
) {
  return prisma.staffUser.create({
    data: {
      name: `${role} uji`,
      email: overrides.email ?? `${role}-${Math.random().toString(36).slice(2)}@uji.id`,
      role,
      passwordHash: await hashPassword(TEST_PASSWORD),
      mustChangePassword: overrides.mustChangePassword ?? false,
    },
  });
}

export async function staffCookie(userId: string, now?: Date) {
  return `${STAFF_COOKIE}=${await createStaffSession(userId, "vitest", now)}`;
}

export async function makeRespondent(actorId: string | null = null, label?: string) {
  return createRespondent(
    { label },
    { type: actorId ? "staff" : "system", id: actorId, ip: "10.0.0.1" },
  );
}

/**
 * Responden yang sudah setuju dan sudah pretest. Hari ke-1 = `dayOneOffset` hari dari hari ini
 * (mis. -5 = pretest lima hari lalu). Mengembalikan cookie sesi dan tanggal penting.
 */
export async function readyRespondent(dayOneOffset = -5, label?: string) {
  const r = await makeRespondent(null, label);
  const today = localDateOf(new Date());
  const dayOne = addDays(today, dayOneOffset);
  await prisma.respondent.update({
    where: { id: r.id },
    data: { consentAt: new Date(), dayOneDate: toDbDate(dayOne) },
  });
  return { ...r, cookie: await respondentCookie(r.id), today, dayOne };
}

/** Jenis minuman aktif dari data awal migration. */
export async function seededBeverage(name: string) {
  return prisma.beverageType.findFirstOrThrow({ where: { name } });
}

/** "YYYY-MM-DD" + "HH:mm" → nilai waktu lokal untuk API pencatatan. */
// Default 00:00 agar catatan "hari ini" tidak pernah jatuh di masa depan saat test dijalankan.
export const at = (date: string, time = "00:00") => `${date}T${time}`;

export async function respondentCookie(respondentId: string) {
  return `${RESPONDENT_COOKIE}=${await createRespondentSession(respondentId, "vitest")}`;
}

/** Mengambil token dari header Set-Cookie. */
export function cookieFrom(res: { headers: Headers }, name: string): string | null {
  const raw = res.headers.get("set-cookie") ?? "";
  const m = new RegExp(`${name}=([^;]*)`).exec(raw);
  return m && m[1] ? `${name}=${m[1]}` : null;
}
