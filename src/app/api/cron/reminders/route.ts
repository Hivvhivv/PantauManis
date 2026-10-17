import { requireCron } from "@/server/auth/guards";
import { AppError } from "@/server/http/errors";
import { json, route } from "@/server/http/route";
import { sendReminders, webPushSender } from "@/server/modules/reminders/service";

export const dynamic = "force-dynamic";

/** Pengingat harian 19.00 WIB (vercel.json: 0 12 * * * UTC). Hanya untuk Vercel Cron (ADR-011). */
export const GET = route(async (req) => {
  requireCron(req);
  const sender = webPushSender();
  if (!sender) {
    throw new AppError(503, "PUSH_NOT_CONFIGURED", "Kunci VAPID belum diisi di server.");
  }
  return json(await sendReminders(sender));
});
