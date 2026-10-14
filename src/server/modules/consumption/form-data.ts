import "server-only";
import type { ReadyRespondent } from "@/server/auth/guards";
import { listBeverageTypes } from "@/server/modules/beverages/service";
import {
  editableDates,
  fromDbDate,
  localDateOf,
  toLocalDateTime,
} from "@/server/modules/study/days";
import { SIZE_PRESETS } from "@/server/modules/study/estimate";
import { getStudySettings } from "@/server/modules/study/settings";

/** Data untuk form pencatatan: jenis minuman aktif, preset ukuran, dan batas waktu yang boleh diisi. */
export async function logFormData(r: ReadyRespondent, now = new Date()) {
  const [settings, types] = await Promise.all([
    getStudySettings(),
    listBeverageTypes({ activeOnly: true }),
  ]);
  const dates = editableDates(localDateOf(now), fromDbDate(r.dayOneDate), settings.backfillDays);
  return {
    beverages: types.map((t) => ({
      id: t.id,
      name: t.name,
      icon: t.icon,
      defaultVolumeMl: t.defaultVolumeMl,
      sugarGPerServing: t.sugarGPerServing,
      sugarLevelApplicable: t.sugarLevelApplicable,
    })),
    sizes: SIZE_PRESETS,
    factors: settings.sugarFactors,
    backfillDays: settings.backfillDays,
    minDateTime: `${dates[0]}T00:00`,
    maxDateTime: toLocalDateTime(now),
    nowLocal: toLocalDateTime(now),
    today: localDateOf(now),
  };
}
