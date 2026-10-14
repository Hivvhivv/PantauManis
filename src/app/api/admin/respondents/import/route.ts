import { requireStaff } from "@/server/auth/guards";
import { validationError } from "@/server/http/errors";
import { json, route } from "@/server/http/route";
import { importRespondentsCsv } from "@/server/modules/respondents/service";

const MAX_BYTES = 512 * 1024;

export const POST = route(async (req) => {
  const { actor } = await requireStaff(req);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0)
    throw validationError({ file: "Pilih berkas CSV." });
  if (file.size > MAX_BYTES) throw validationError({ file: "Ukuran berkas maksimal 512 KB." });
  return json({ items: await importRespondentsCsv(await file.text(), actor) }, { status: 201 });
});
