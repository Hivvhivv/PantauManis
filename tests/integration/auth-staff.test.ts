import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/staff/login/route";
import { POST as logout } from "@/app/api/auth/staff/logout/route";
import { POST as changePassword } from "@/app/api/auth/staff/change-password/route";
import { GET as listRespondents } from "@/app/api/admin/respondents/route";
import { prisma } from "@/server/db";
import { STAFF_IDLE_MS, resolveStaffSession } from "@/server/auth/sessions";
import { STAFF_LOGIN_FAILED } from "@/server/modules/auth-service";
import { call, cookieFrom, makeStaff, staffCookie, TEST_PASSWORD } from "../support/helpers";

const loginAs = (email: string, password: string, ip = "10.0.0.1") =>
  call(login, { body: { email, password }, headers: { "x-forwarded-for": ip } });

describe("login staf (email + kata sandi)", () => {
  it("berhasil: cookie sesi dibuat, diarahkan ke /admin, dicatat di audit", async () => {
    const u = await makeStaff("admin", { email: "admin@uji.id" });
    const res = await loginAs(" ADMIN@uji.id ", TEST_PASSWORD);
    expect(res.status).toBe(200);
    expect(res.json.redirectTo).toBe("/admin");
    expect(cookieFrom(res, "pm_staf")).not.toBeNull();
    expect(await prisma.auditLog.count({ where: { action: "staff.login", actorId: u.id } })).toBe(
      1,
    );
    expect(
      (await prisma.staffUser.findUnique({ where: { id: u.id } }))!.lastLoginAt,
    ).not.toBeNull();
  });

  it("kata sandi salah, email tidak dikenal, atau akun nonaktif → pesan umum yang sama", async () => {
    const off = await makeStaff("admin", { email: "nonaktif@uji.id" });
    await prisma.staffUser.update({ where: { id: off.id }, data: { isActive: false } });
    await makeStaff("admin", { email: "ada@uji.id" });

    const cases: [string, string][] = [
      ["ada@uji.id", "salah-sekali"],
      ["tidakada@uji.id", TEST_PASSWORD],
      ["nonaktif@uji.id", TEST_PASSWORD],
    ];
    for (const [i, [email, pw]] of cases.entries()) {
      const res = await loginAs(email, pw, `10.5.0.${i}`);
      expect(res.status).toBe(401);
      expect(res.json.error.message).toBe(STAFF_LOGIN_FAILED);
      expect(res.text).not.toContain(pw);
    }
  });

  it("5 kali gagal per email dalam 15 menit → diblokir walau dari IP berbeda", async () => {
    await makeStaff("admin", { email: "target@uji.id" });
    for (let i = 0; i < 5; i++) await loginAs("target@uji.id", "salah", `10.6.0.${i}`);
    expect((await loginAs("target@uji.id", TEST_PASSWORD, "10.6.1.1")).status).toBe(429);
  });

  it("sesi berakhir setelah 2 jam tidak aktif", async () => {
    const u = await makeStaff("admin");
    const start = new Date();
    const token = (await staffCookie(u.id, start)).split("=")[1];
    expect(
      await resolveStaffSession(token, new Date(start.getTime() + STAFF_IDLE_MS - 60_000)),
    ).not.toBeNull();
    // Aktivitas di atas memperbarui last_seen_at; 2 jam + 1 menit setelahnya sesi habis.
    const later = new Date(start.getTime() + 2 * STAFF_IDLE_MS + 60_000);
    expect(await resolveStaffSession(token, later)).toBeNull();
  });

  it("Keluar menghapus sesi dan dicatat di audit", async () => {
    const u = await makeStaff("admin");
    const cookie = await staffCookie(u.id);
    expect((await call(logout, { method: "POST", cookie })).status).toBe(200);
    expect(await resolveStaffSession(cookie.split("=")[1])).toBeNull();
    expect(await prisma.auditLog.count({ where: { action: "staff.logout" } })).toBe(1);
  });
});

describe("wajib ganti kata sandi", () => {
  it("akun baru diarahkan ke ganti kata sandi dan diblokir dari API lain", async () => {
    const u = await makeStaff("admin", { email: "baru@uji.id", mustChangePassword: true });
    const res = await loginAs("baru@uji.id", TEST_PASSWORD);
    expect(res.json.redirectTo).toBe("/staf/ganti-kata-sandi");
    const cookie = cookieFrom(res, "pm_staf")!;

    const blocked = await call(listRespondents, { cookie });
    expect(blocked.status).toBe(403);
    expect(blocked.json.error.code).toBe("PASSWORD_CHANGE_REQUIRED");

    const changed = await call(changePassword, {
      cookie,
      body: { currentPassword: TEST_PASSWORD, newPassword: "kata-sandi-baru-456" },
    });
    expect(changed.status).toBe(200);
    // Sesi lama dicabut, sesi baru diterbitkan.
    expect(await resolveStaffSession(cookie.split("=")[1])).toBeNull();
    const fresh = cookieFrom(changed, "pm_staf")!;
    expect((await call(listRespondents, { cookie: fresh })).status).toBe(200);
    expect((await prisma.staffUser.findUnique({ where: { id: u.id } }))!.mustChangePassword).toBe(
      false,
    );
  });

  it("menolak kata sandi saat ini yang salah dan kata sandi baru yang terlalu pendek", async () => {
    const u = await makeStaff("admin");
    const cookie = await staffCookie(u.id);
    const wrong = await call(changePassword, {
      cookie,
      body: { currentPassword: "x", newPassword: "panjang-sekali" },
    });
    expect(wrong.status).toBe(422);
    expect(wrong.json.error.fields.currentPassword).toBeDefined();
    const short = await call(changePassword, {
      cookie,
      body: { currentPassword: TEST_PASSWORD, newPassword: "1234567" },
    });
    expect(short.status).toBe(422);
    expect(short.json.error.fields.newPassword).toBeDefined();
  });
});
