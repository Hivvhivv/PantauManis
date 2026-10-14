import { describe, expect, it } from "vitest";
import * as respondents from "@/app/api/admin/respondents/route";
import * as respondentById from "@/app/api/admin/respondents/[id]/route";
import { POST as bulk } from "@/app/api/admin/respondents/bulk/route";
import { POST as importCsv } from "@/app/api/admin/respondents/import/route";
import { GET as codesCsv } from "@/app/api/admin/respondents/codes.csv/route";
import { POST as reveal } from "@/app/api/admin/respondents/[id]/reveal-code/route";
import { POST as resetCode } from "@/app/api/admin/respondents/[id]/reset-code/route";
import { POST as status } from "@/app/api/admin/respondents/[id]/status/route";
import * as users from "@/app/api/superadmin/users/route";
import * as staffById from "@/app/api/superadmin/staff/[id]/route";
import { POST as resetPassword } from "@/app/api/superadmin/staff/[id]/reset-password/route";
import { POST as ackAlert } from "@/app/api/superadmin/security-alerts/[id]/ack/route";
import { call, makeRespondent, makeStaff, respondentCookie, staffCookie } from "../support/helpers";

const ID = "00000000-0000-4000-8000-000000000000";

/** Semua endpoint staf: [nama, handler, opsi]. */
const adminEndpoints = [
  ["GET respondents", respondents.GET, {}],
  ["POST respondents", respondents.POST, { body: {} }],
  ["POST bulk", bulk, { body: { count: 1 } }],
  ["POST import", importCsv, { form: new FormData() }],
  ["GET codes.csv", codesCsv, {}],
  ["GET respondent", respondentById.GET, { params: { id: ID } }],
  ["PATCH respondent", respondentById.PATCH, { method: "PATCH", body: {}, params: { id: ID } }],
  ["POST reveal", reveal, { method: "POST", params: { id: ID } }],
  ["POST reset-code", resetCode, { method: "POST", params: { id: ID } }],
  ["POST status", status, { body: { status: "inactive" }, params: { id: ID } }],
] as const;

const superadminEndpoints = [
  ["GET users", users.GET, {}],
  ["POST users", users.POST, { body: { role: "admin" } }],
  ["GET staff", staffById.GET, { params: { id: ID } }],
  ["PATCH staff", staffById.PATCH, { method: "PATCH", body: {}, params: { id: ID } }],
  ["DELETE staff", staffById.DELETE, { method: "DELETE", params: { id: ID } }],
  ["POST reset-password", resetPassword, { method: "POST", params: { id: ID } }],
  ["POST ack alert", ackAlert, { method: "POST", params: { id: ID } }],
  ["DELETE respondent", respondentById.DELETE, { method: "DELETE", params: { id: ID } }],
] as const;

describe("kontrol akses di server", () => {
  it.each([...adminEndpoints, ...superadminEndpoints])(
    "%s tanpa login → 401",
    async (_n, handler, opts) => {
      const res = await call(handler, opts as never);
      expect(res.status).toBe(401);
    },
  );

  it.each([...adminEndpoints, ...superadminEndpoints])(
    "%s dengan sesi Responden → 401",
    async (_n, handler, opts) => {
      const r = await makeRespondent();
      const res = await call(handler, {
        ...(opts as object),
        cookie: await respondentCookie(r.id),
      });
      expect(res.status).toBe(401);
    },
  );

  it.each(superadminEndpoints)("AC-06: Admin → %s ditolak 403", async (_n, handler, opts) => {
    const admin = await makeStaff("admin");
    const res = await call(handler, { ...(opts as object), cookie: await staffCookie(admin.id) });
    expect(res.status).toBe(403);
    expect(res.json.error.code).toBe("FORBIDDEN");
  });

  it("Admin boleh memakai endpoint List Responden", async () => {
    const admin = await makeStaff("admin");
    expect((await call(respondents.GET, { cookie: await staffCookie(admin.id) })).status).toBe(200);
  });

  it("Superadmin boleh memakai endpoint Admin dan Superadmin", async () => {
    const s = await makeStaff("superadmin");
    const cookie = await staffCookie(s.id);
    expect((await call(respondents.GET, { cookie })).status).toBe(200);
    expect((await call(users.GET, { cookie })).status).toBe(200);
  });

  it("menolak request lintas origin (CSRF)", async () => {
    const admin = await makeStaff("admin");
    const res = await call(respondents.POST, {
      body: {},
      cookie: await staffCookie(admin.id),
      headers: { origin: "https://situs-jahat.example", host: "localhost:3000" },
    });
    expect(res.status).toBe(403);
  });

  it("ID tidak valid di URL → 404, bukan error server", async () => {
    const admin = await makeStaff("admin");
    const res = await call(respondentById.GET, {
      cookie: await staffCookie(admin.id),
      params: { id: "../../etc" },
    });
    expect(res.status).toBe(404);
  });

  it("format error seragam: kode, pesan, dan daftar kolom", async () => {
    const admin = await makeStaff("admin");
    const res = await call(respondents.POST, {
      cookie: await staffCookie(admin.id),
      body: { label: "R 001!" },
    });
    expect(res.status).toBe(422);
    expect(res.json.error).toMatchObject({ code: "VALIDATION_ERROR", message: expect.any(String) });
    expect(res.json.error.fields.label).toBeDefined();
  });
});
