import { describe, expect, it } from "vitest";
import * as users from "@/app/api/superadmin/users/route";
import * as staffById from "@/app/api/superadmin/staff/[id]/route";
import { POST as resetPassword } from "@/app/api/superadmin/staff/[id]/reset-password/route";
import { POST as staffLogin } from "@/app/api/auth/staff/login/route";
import { POST as codeLogin } from "@/app/api/auth/respondent/login/route";
import { prisma } from "@/server/db";
import { resolveStaffSession } from "@/server/auth/sessions";
import { call, makeStaff, staffCookie } from "../support/helpers";

async function superCookie() {
  const s = await makeStaff("superadmin");
  return { me: s, cookie: await staffCookie(s.id) };
}

const patchBody = (u: { name: string; email: string }, extra: Record<string, unknown>) => ({
  name: u.name,
  email: u.email,
  role: "admin",
  isActive: true,
  ...extra,
});

describe("Tambah Pengguna dengan dropdown peran", () => {
  it("AC-08: peran Responden → kolom Responden dipakai dan kode dibuat otomatis", async () => {
    const { cookie } = await superCookie();
    const res = await call(users.POST, {
      cookie,
      body: { role: "respondent", label: "", initials: "GH" },
    });
    expect(res.status).toBe(201);
    expect(res.json.kind).toBe("respondent");
    expect(res.json.issued.label).toBe("R001");
    expect(res.json.issued.code).toMatch(/^PM-\d{6}$/);
    expect((await call(codeLogin, { body: { code: res.json.issued.code } })).status).toBe(200);
    expect(await prisma.staffUser.count()).toBe(1); // tidak membuat akun staf
  });

  it("peran Admin tanpa kata sandi → kata sandi sementara, wajib diganti saat login pertama", async () => {
    const { cookie } = await superCookie();
    const res = await call(users.POST, {
      cookie,
      body: { role: "admin", name: "Peneliti Satu", email: "Peneliti@Uji.id", password: "" },
    });
    expect(res.status).toBe(201);
    expect(res.json.temporaryPassword).toMatch(/^.{12}$/);
    const login = await call(staffLogin, {
      body: { email: "peneliti@uji.id", password: res.json.temporaryPassword },
    });
    expect(login.json.redirectTo).toBe("/staf/ganti-kata-sandi");
  });

  it("kolom staf wajib untuk peran staf; email ganda ditolak", async () => {
    const { cookie, me } = await superCookie();
    const missing = await call(users.POST, { cookie, body: { role: "admin" } });
    expect(missing.status).toBe(422);
    expect(missing.json.error.fields).toHaveProperty("name");
    expect(missing.json.error.fields).toHaveProperty("email");
    const dup = await call(users.POST, {
      cookie,
      body: { role: "admin", name: "X", email: me.email },
    });
    expect(dup.status).toBe(409);
  });

  it("menolak peran yang tidak dikenal", async () => {
    const { cookie } = await superCookie();
    expect(
      (await call(users.POST, { cookie, body: { role: "root", name: "X", email: "x@uji.id" } }))
        .status,
    ).toBe(422);
  });
});

describe("aturan perubahan peran (FR-S-02)", () => {
  it("AC-09: Superadmin tidak dapat menurunkan peran dirinya sendiri", async () => {
    const { me, cookie } = await superCookie();
    await makeStaff("superadmin"); // masih ada Superadmin lain
    const res = await call(staffById.PATCH, {
      method: "PATCH",
      cookie,
      params: { id: me.id },
      body: patchBody(me, { confirmRoleChange: true }),
    });
    expect(res.status).toBe(422);
    expect(res.json.error.code).toBe("SELF_DEMOTE");
    expect(res.json.error.message).toMatch(/menurunkan peran akun Anda sendiri/);
  });

  it("tidak dapat menghapus atau menonaktifkan diri sendiri", async () => {
    const { me, cookie } = await superCookie();
    const del = await call(staffById.DELETE, { method: "DELETE", cookie, params: { id: me.id } });
    expect(del.json.error.code).toBe("SELF_DELETE");
    const off = await call(staffById.PATCH, {
      method: "PATCH",
      cookie,
      params: { id: me.id },
      body: patchBody(me, { role: "superadmin", isActive: false }),
    });
    expect(off.json.error.code).toBe("SELF_DEACTIVATE");
  });

  it("Admin ↔ Superadmin diperbolehkan dengan konfirmasi dan dicatat di audit", async () => {
    const { cookie } = await superCookie();
    const admin = await makeStaff("admin");
    const p = { method: "PATCH", cookie, params: { id: admin.id } };

    const noConfirm = await call(staffById.PATCH, {
      ...p,
      body: patchBody(admin, { role: "superadmin" }),
    });
    expect(noConfirm.json.error.code).toBe("CONFIRMATION_REQUIRED");

    const ok = await call(staffById.PATCH, {
      ...p,
      body: patchBody(admin, { role: "superadmin", confirmRoleChange: true }),
    });
    expect(ok.status).toBe(200);
    expect((await prisma.staffUser.findUniqueOrThrow({ where: { id: admin.id } })).role).toBe(
      "superadmin",
    );
    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: "staff.role_changed" } });
    expect(log.metadata).toEqual({ from: "admin", to: "superadmin" });
  });

  it("akun staf tidak dapat diubah menjadi Responden", async () => {
    const { cookie } = await superCookie();
    const admin = await makeStaff("admin");
    const res = await call(staffById.PATCH, {
      method: "PATCH",
      cookie,
      params: { id: admin.id },
      body: patchBody(admin, { role: "respondent", confirmRoleChange: true }),
    });
    expect(res.status).toBe(422);
    expect(res.json.error.fields.role).toMatch(/Responden/);
  });

  it("minimal satu Superadmin aktif tetap terjaga", async () => {
    const { me, cookie } = await superCookie();
    const other = await makeStaff("superadmin");
    // Menurunkan Superadmin lain boleh selama masih ada satu (diri sendiri).
    const ok = await call(staffById.PATCH, {
      method: "PATCH",
      cookie,
      params: { id: other.id },
      body: patchBody(other, { confirmRoleChange: true }),
    });
    expect(ok.status).toBe(200);
    expect(await prisma.staffUser.count({ where: { role: "superadmin", isActive: true } })).toBe(1);
    expect(me.role).toBe("superadmin");
  });

  it("menonaktifkan staf mengakhiri sesinya", async () => {
    const { cookie } = await superCookie();
    const admin = await makeStaff("admin");
    const token = (await staffCookie(admin.id)).split("=")[1];
    await call(staffById.PATCH, {
      method: "PATCH",
      cookie,
      params: { id: admin.id },
      body: patchBody(admin, { isActive: false }),
    });
    expect(await resolveStaffSession(token)).toBeNull();
  });
});

describe("reset kata sandi dan hapus staf", () => {
  it("reset: kata sandi sementara, sesi dicabut, wajib ganti", async () => {
    const { cookie } = await superCookie();
    const admin = await makeStaff("admin", { email: "reset@uji.id" });
    const token = (await staffCookie(admin.id)).split("=")[1];
    const res = await call(resetPassword, { method: "POST", cookie, params: { id: admin.id } });
    expect(res.status).toBe(200);
    expect(await resolveStaffSession(token)).toBeNull();
    const login = await call(staffLogin, {
      body: { email: "reset@uji.id", password: res.json.temporaryPassword },
    });
    expect(login.json.redirectTo).toBe("/staf/ganti-kata-sandi");
  });

  it("hapus lunak: tidak bisa login, hilang dari daftar pengguna", async () => {
    const { cookie } = await superCookie();
    const admin = await makeStaff("admin", { email: "hapus@uji.id" });
    expect(
      (await call(staffById.DELETE, { method: "DELETE", cookie, params: { id: admin.id } })).status,
    ).toBe(200);
    expect(
      (await call(staffLogin, { body: { email: "hapus@uji.id", password: "kata-sandi-uji-123" } }))
        .status,
    ).toBe(401);
    const list = await call(users.GET, { cookie, url: "/api/superadmin/users?role=admin" });
    expect(list.json.total).toBe(0);
  });
});

describe("daftar semua pengguna", () => {
  it("satu tabel untuk semua peran dengan filter peran", async () => {
    const { cookie } = await superCookie();
    await makeStaff("admin");
    await call(users.POST, { cookie, body: { role: "respondent" } });
    const all = await call(users.GET, { cookie });
    expect(all.json.items.map((u: { role: string }) => u.role)).toEqual([
      "superadmin",
      "admin",
      "respondent",
    ]);
    const onlyResp = await call(users.GET, {
      cookie,
      url: "/api/superadmin/users?role=respondent",
    });
    expect(onlyResp.json.total).toBe(1);
    expect(onlyResp.json.items[0].secondary).toMatch(/^PM-\d{2}••••$/);
  });
});
