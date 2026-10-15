import { requireStaff } from "@/server/auth/guards";
import { json, parseJson, route } from "@/server/http/route";
import { instrumentSchema, saveInstrument } from "@/server/modules/questionnaires/admin";

/** Simpan soal pretest/posttest (ADR-010). Ditolak bila sudah ada responden yang mengisi. */
export const PUT = route(async (req) => {
  const { actor } = await requireStaff(req);
  await saveInstrument(await parseJson(req, instrumentSchema), actor);
  return json({ ok: true });
});
