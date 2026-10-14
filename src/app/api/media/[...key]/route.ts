import { notFound } from "@/server/http/errors";
import { route } from "@/server/http/route";
import { readLocal, storageDriver } from "@/server/storage";

/**
 * Menyajikan gambar edukasi dari folder lokal (driver "local", untuk dev/test).
 * Di production (driver "supabase") gambar disajikan langsung oleh Supabase Storage.
 */
export const GET = route<{ key: string[] }>(async (_req, ctx) => {
  if (storageDriver() !== "local") throw notFound();
  const { key } = await ctx.params;
  const file = await readLocal(key.join("/"));
  if (!file) throw notFound();
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
