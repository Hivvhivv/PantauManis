import { requireStaff } from "@/server/auth/guards";
import { validationError } from "@/server/http/errors";
import { json, route } from "@/server/http/route";
import { uploadImage } from "@/server/modules/education/service";

/** Unggah gambar materi (maks. 4 MB; JPG/PNG/WebP, dicek dari isi file). */
export const POST = route(async (req) => {
  await requireStaff(req);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw validationError({ file: "Pilih file gambar." });
  return json(await uploadImage(file), { status: 201 });
});
