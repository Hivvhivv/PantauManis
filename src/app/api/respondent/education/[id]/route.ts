import { requireReadyRespondent } from "@/server/auth/guards";
import { idParam, json, route } from "@/server/http/route";
import { readMaterial } from "@/server/modules/education/service";

/** Membuka materi (tercatat sudah dibaca). Materi terkunci → 403, draf/terhapus → 404. */
export const GET = route<{ id: string }>(async (req, ctx) => {
  const r = await requireReadyRespondent(req);
  return json(await readMaterial(r, await idParam(ctx)));
});
