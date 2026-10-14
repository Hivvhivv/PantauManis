import { requireSuperadmin } from "@/server/auth/guards";
import { json, parseJson, route } from "@/server/http/route";
import {
  getSettingsForm,
  settingsSchema,
  updateSettings,
} from "@/server/modules/study/settings-admin";

export const GET = route(async (req) => {
  await requireSuperadmin(req);
  return json(await getSettingsForm());
});

export const PUT = route(async (req) => {
  const { actor } = await requireSuperadmin(req);
  return json(await updateSettings(await parseJson(req, settingsSchema), actor));
});
