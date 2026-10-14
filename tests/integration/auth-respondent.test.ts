import { describe, expect, it, vi } from "vitest";
import { POST as login } from "@/app/api/auth/respondent/login/route";
import { POST as logout } from "@/app/api/auth/respondent/logout/route";
import { prisma } from "@/server/db";
import { GLOBAL_CODE_LIMIT } from "@/server/auth/rate-limit";
import { resolveRespondentSession } from "@/server/auth/sessions";
import { setAccessStatus, softDeleteRespondent } from "@/server/modules/respondents/service";
import { CODE_LOGIN_FAILED } from "@/server/modules/auth-service";
import { call, cookieFrom, makeRespondent } from "../support/helpers";

const sys = { type: "system" as const, id: null, ip: null };
const loginAs = (code: string, ip = "10.0.0.1") =>
  call(login, { body: { code }, headers: { "x-forwarded-for": ip } });

describe("login Responden dengan kode akses", () => {
  it("AC-01: kode aktif yang valid → masuk, cookie HttpOnly, diarahkan ke /persetujuan (login pertama)", async () => {
    const r = await makeRespondent();
    const res = await loginAs(r.code);
    expect(res.status).toBe(200);
    expect(res.json.redirectTo).toBe("/persetujuan");
    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toMatch(/pm_resp=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=lax/i);
    expect(setCookie).toMatch(/Max-Age=2592000/); // 30 hari
  });

  it("input toleran: tanpa PM-, huruf kecil, spasi, dan strip", async () => {
    const r = await makeRespondent();
    const digits = r.code.slice(3);
    for (const variant of [
      digits,
      `pm ${digits.slice(0, 3)}-${digits.slice(3)}`,
      ` PM-${digits} `,
    ]) {
      expect((await loginAs(variant)).status).toBe(200);
    }
  });

  it("AC-02: kode salah, nonaktif, atau terhapus → pesan umum yang sama", async () => {
    const inactive = await makeRespondent();
    await setAccessStatus(inactive.id, "inactive", sys);
    const deleted = await makeRespondent();
    await softDeleteRespondent(deleted.id, sys);

    for (const [i, code] of ["PM-000001", inactive.code, deleted.code, "bukan-kode"].entries()) {
      const res = await loginAs(code, `10.1.0.${i}`);
      expect(res.status).toBe(401);
      expect(res.json.error.message).toBe(CODE_LOGIN_FAILED);
      expect(res.text).not.toContain(code.replace("PM-", ""));
    }
  });

  it("AC-03: 5 kali gagal dalam 15 menit → diblokir, bahkan dengan kode benar; IP lain tidak terdampak", async () => {
    const r = await makeRespondent();
    for (let i = 0; i < 5; i++) expect((await loginAs("PM-000001", "10.2.0.1")).status).toBe(401);
    const blocked = await loginAs(r.code, "10.2.0.1");
    expect(blocked.status).toBe(429);
    expect((await loginAs(r.code, "10.2.0.2")).status).toBe(200);
  });

  it("rate limit global: ≥ 50 gagal dari banyak IP → login kode ditunda + satu peringatan + audit", async () => {
    const r = await makeRespondent();
    for (let i = 0; i < GLOBAL_CODE_LIMIT; i++)
      await loginAs("PM-000001", `10.3.${Math.floor(i / 4)}.${i % 4}`);

    expect((await loginAs(r.code, "10.9.9.9")).status).toBe(429);
    expect(await prisma.securityAlert.count()).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: "security.code_login_paused" } })).toBe(
      1,
    );

    // Percobaan lanjutan tidak menambah peringatan baru.
    await loginAs("PM-000001", "10.8.8.8");
    expect(await prisma.securityAlert.count()).toBe(1);
  });

  it("satu IP yang terus mencoba tidak memicu jeda global", async () => {
    for (let i = 0; i < 60; i++) await loginAs("PM-000001", "10.4.0.1");
    expect(await prisma.securityAlert.count()).toBe(0);
    const r = await makeRespondent();
    expect((await loginAs(r.code, "10.4.0.2")).status).toBe(200);
  });

  it("menonaktifkan responden langsung mengakhiri sesinya", async () => {
    const r = await makeRespondent();
    const cookie = cookieFrom(await loginAs(r.code), "pm_resp")!;
    const token = cookie.split("=")[1];
    expect(await resolveRespondentSession(token)).not.toBeNull();
    await setAccessStatus(r.id, "inactive", sys);
    expect(await resolveRespondentSession(token)).toBeNull();
  });

  it("sesi berakhir setelah 30 hari; kode tidak kedaluwarsa", async () => {
    const r = await makeRespondent();
    const token = cookieFrom(await loginAs(r.code), "pm_resp")!.split("=")[1];
    const day31 = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
    expect(await resolveRespondentSession(token, day31)).toBeNull();
    expect((await loginAs(r.code)).status).toBe(200);
  });

  it("Keluar menghapus sesi di server", async () => {
    const r = await makeRespondent();
    const cookie = cookieFrom(await loginAs(r.code), "pm_resp")!;
    expect((await call(logout, { method: "POST", cookie })).status).toBe(200);
    expect(await resolveRespondentSession(cookie.split("=")[1])).toBeNull();
  });

  it("tidak mencatat kode akses di log server", async () => {
    const spies = [vi.spyOn(console, "error"), vi.spyOn(console, "warn"), vi.spyOn(console, "log")];
    const r = await makeRespondent();
    await loginAs(r.code);
    await loginAs("PM-482915");
    const logged = spies.flatMap((s) => s.mock.calls.flat().map(String)).join(" ");
    expect(logged).not.toContain(r.code.slice(3));
    expect(logged).not.toContain("482915");
    spies.forEach((s) => s.mockRestore());
  });
});
