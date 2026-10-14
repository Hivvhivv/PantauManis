import { requireStaff } from "@/server/auth/guards";
import { idParam, json, route } from "@/server/http/route";
import { getRespondentResults } from "@/server/modules/respondents/results";

/** "Lihat Hasil Responden" (FR-A-04): diambil saat tombol diklik, dicatat di audit log. */
export const GET = route<{ id: string }>(async (req, ctx) => {
  const { actor } = await requireStaff(req);
  return json(await getRespondentResults(await idParam(ctx), actor));
});
