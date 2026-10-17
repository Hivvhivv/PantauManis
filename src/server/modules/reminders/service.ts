import "server-only";
import webpush from "web-push";
import { z } from "zod";
import type { Respondent } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { AuditAction, writeAudit } from "@/server/modules/audit";
import { fromDbDate, localDateOf, toDbDate } from "@/server/modules/study/days";
import { getStudySettings } from "@/server/modules/study/settings";
import { REMINDER_MESSAGES, reminderFor } from "./rules";

/** Langganan dari `PushSubscription.toJSON()` di browser. */
export const subscriptionSchema = z.object({
  endpoint: z
    .url({ error: "Alamat langganan tidak valid." })
    .max(1000)
    .refine((u) => u.startsWith("https://"), "Alamat langganan harus HTTPS."),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});

/** Kunci publik VAPID untuk browser; null bila pengingat belum diatur di server. */
export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

/** Simpan langganan perangkat ini untuk responden yang login (BR-09: dari sesi). */
export async function saveSubscription(
  r: Respondent,
  input: z.infer<typeof subscriptionSchema>,
  userAgent: string | null,
) {
  const data = {
    respondentId: r.id,
    p256dh: input.keys.p256dh,
    auth: input.keys.auth,
    userAgent: userAgent?.slice(0, 300) ?? null,
  };
  // Perangkat yang sama dipakai responden lain → langganan pindah ke responden yang login.
  await prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: { endpoint: input.endpoint, ...data },
    update: data,
  });
}

/** Matikan pengingat di perangkat ini. Hanya langganan milik responden yang login. */
export async function removeSubscription(r: Respondent, endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint, respondentId: r.id } });
}

export type PushTarget = { endpoint: string; p256dh: string; auth: string };
/** "ok" terkirim; "gone" langganan sudah tidak berlaku (hapus); "failed" gagal sementara. */
export type PushSender = (target: PushTarget, payload: string) => Promise<"ok" | "gone" | "failed">;

/** Pengirim Web Push sungguhan; null bila kunci VAPID belum diisi. */
export function webPushSender(): PushSender | null {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subject) return null;
  webpush.setVapidDetails(subject, pub, priv);
  return async (t, payload) => {
    try {
      await webpush.sendNotification(
        { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
        payload,
        { TTL: 6 * 3600, urgency: "normal" },
      );
      return "ok";
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      return status === 404 || status === 410 ? "gone" : "failed";
    }
  };
}

/**
 * Kirim pengingat hari ini (dipanggil Vercel Cron pukul 19.00 WIB). Satu pengingat per
 * responden; langganan yang sudah tidak berlaku dihapus. Ringkasan dicatat di audit log.
 */
export async function sendReminders(sender: PushSender, now = new Date()) {
  const settings = await getStudySettings();
  const today = localDateOf(now);
  const rows = await prisma.respondent.findMany({
    where: {
      deletedAt: null,
      accessStatus: "active",
      dayOneDate: { not: null },
      pushSubscriptions: { some: {} },
    },
    select: {
      id: true,
      dayOneDate: true,
      pushSubscriptions: true,
      dailyStatuses: { where: { date: toDbDate(today) }, select: { id: true } },
      responses: {
        where: { status: "submitted", questionnaire: { type: "posttest" } },
        select: { id: true },
      },
    },
  });

  const counts = { respondents: 0, sent: 0, failed: 0, removed: 0 };
  for (const r of rows) {
    const kind = reminderFor({
      dayOne: fromDbDate(r.dayOneDate!),
      today,
      durationDays: settings.durationDays,
      graceDays: settings.posttestGraceDays,
      recordedToday: r.dailyStatuses.length > 0,
      posttestSubmitted: r.responses.length > 0,
    });
    if (!kind) continue;
    counts.respondents++;
    const payload = JSON.stringify(REMINDER_MESSAGES[kind]);
    for (const s of r.pushSubscriptions) {
      const result = await sender(s, payload);
      if (result === "ok") {
        counts.sent++;
        await prisma.pushSubscription.update({ where: { id: s.id }, data: { lastSentAt: now } });
      } else if (result === "gone") {
        counts.removed++;
        await prisma.pushSubscription.deleteMany({ where: { id: s.id } });
      } else {
        counts.failed++;
      }
    }
  }
  await writeAudit({
    actor: { type: "system", id: null, ip: null },
    action: AuditAction.RemindersSent,
    metadata: { date: today, ...counts },
  });
  return counts;
}
