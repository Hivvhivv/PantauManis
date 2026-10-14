import { requireReadyRespondent } from "@/server/auth/guards";
import { json, route } from "@/server/http/route";
import { listBeverageTypes } from "@/server/modules/beverages/service";
import { SIZE_PRESETS } from "@/server/modules/study/estimate";

export const GET = route(async (req) => {
  await requireReadyRespondent(req);
  const types = await listBeverageTypes({ activeOnly: true });
  return json({
    types: types.map((t) => ({
      id: t.id,
      name: t.name,
      icon: t.icon,
      defaultVolumeMl: t.defaultVolumeMl,
      sugarLevelApplicable: t.sugarLevelApplicable,
    })),
    sizes: SIZE_PRESETS,
  });
});
