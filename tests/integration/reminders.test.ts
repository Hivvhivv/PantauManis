import { afterEach, describe, expect, it } from "vitest";
import * as push from "@/app/api/respondent/push/route";
import { GET as cron } from "@/app/api/cron/reminders/route";
import { prisma } from "@/server/db";
import { sendReminders, type PushSender } from "@/server/modules/reminders/service";
import { addDays, toDbDate } from "@/server/modules/study/days";
import { call, makeStaff, readyRespondent, staffCookie } from "../support/helpers";

const sub = (n: number) => ({
  endpoint: `https://push.example.com/send/${n}`,
  keys: { p256dh: `p256dh-${n}`, auth: `auth-${n}` },
});

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe("Langganan pengingat (ADR-011)", () => {
  it("responden menyimpan dan menghapus langganannya sendiri; staf ditolak", async () => {
    const a = await readyRespondent(-1, "R001");
    const b = await readyRespondent(-1, "R002");
    expect((await call(push.POST, { cookie: a.cookie, body: sub(1) })).status).toBe(201);
    // Simpan ulang perangkat yang sama tidak menggandakan baris.
    await call(push.POST, { cookie: a.cookie, body: sub(1) });
    expect(await prisma.pushSubscription.count({ where: { respondentId: a.id } })).toBe(1);

    // Responden lain tidak bisa menghapus langganan milik A.
    await call(push.DELETE, {
      cookie: b.cookie,
      method: "DELETE",
      body: { endpoint: sub(1).endpoint },
    });
    expect(await prisma.pushSubscription.count()).toBe(1);
    await call(push.DELETE, {
      cookie: a.cookie,
      method: "DELETE",
      body: { endpoint: sub(1).endpoint },
    });
    expect(await prisma.pushSubscription.count()).toBe(0);

    const staff = await staffCookie((await makeStaff("admin")).id);
    expect((await call(push.POST, { cookie: staff, body: sub(2) })).status).toBe(401);
    const http = await call(push.POST, {
      cookie: a.cookie,
      body: { ...sub(3), endpoint: "http://tidak-aman.example.com/x" },
    });
    expect(http.status).toBe(422);
  });

  it("endpoint cron ditolak tanpa CRON_SECRET yang benar", async () => {
    process.env.CRON_SECRET = "rahasia-cron-uji-1234567890";
    expect((await call(cron)).status).toBe(401);
    const wrong = await call(cron, { headers: { authorization: "Bearer salah" } });
    expect(wrong.status).toBe(401);
    // Secret benar tetapi VAPID belum diatur → 503, bukan kirim diam-diam.
    delete process.env.VAPID_PUBLIC_KEY;
    const ok = await call(cron, {
      headers: { authorization: "Bearer rahasia-cron-uji-1234567890" },
    });
    expect(ok.status).toBe(503);
  });
});

describe("Pengiriman pengingat (ADR-011)", () => {
  it("hanya yang Belum diisi hari ini / posttest terbuka; langganan mati dihapus", async () => {
    const belum = await readyRespondent(-2, "R001"); // hari ke-3, belum mencatat
    const sudah = await readyRespondent(-2, "R002"); // hari ke-3, sudah Nol
    const post = await readyRespondent(-13, "R003"); // hari ke-14 → posttest
    const mati = await readyRespondent(-2, "R004"); // langganan sudah tidak berlaku
    await prisma.dailyStatus.create({
      data: { respondentId: sudah.id, date: toDbDate(sudah.today), studyDay: 3, status: "zero" },
    });
    for (const [i, r] of [belum, sudah, post, mati].entries()) {
      await call(push.POST, { cookie: r.cookie, body: sub(i + 1) });
    }

    const sentTo: { endpoint: string; url: string }[] = [];
    const sender: PushSender = async (t, payload) => {
      if (t.endpoint === sub(4).endpoint) return "gone";
      sentTo.push({ endpoint: t.endpoint, url: JSON.parse(payload).url });
      return "ok";
    };
    const counts = await sendReminders(sender);

    expect(sentTo).toEqual([
      { endpoint: sub(1).endpoint, url: "/catat" },
      { endpoint: sub(3).endpoint, url: "/posttest" },
    ]);
    expect(counts).toMatchObject({ respondents: 3, sent: 2, removed: 1, failed: 0 });
    expect(await prisma.pushSubscription.count({ where: { respondentId: mati.id } })).toBe(0);
    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: "reminders.sent" } });
    expect(log.metadata).toMatchObject({ sent: 2, removed: 1 });
    expect(addDays(post.dayOne, 13)).toBe(post.today);
  });
});
