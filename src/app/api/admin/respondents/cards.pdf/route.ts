import { requireStaff } from "@/server/auth/guards";
import { notFound } from "@/server/http/errors";
import { route } from "@/server/http/route";
import { env } from "@/server/env";
import { cardsPdf } from "@/server/modules/respondents/cards-pdf";
import { cardsData } from "@/server/modules/respondents/service";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Unduh PDF kartu kode (satu halaman A4 per responden aktif). Dicatat di audit log. */
export const GET = route(async (req) => {
  const { actor } = await requireStaff(req);
  const ids = req.nextUrl.searchParams
    .getAll("id")
    .filter((x) => UUID_RE.test(x))
    .slice(0, 200);
  const cards = await cardsData(actor, ids);
  if (cards.length === 0) throw notFound("Tidak ada responden aktif untuk dicetak.");
  const pdf = await cardsPdf(cards, new URL("/masuk", env().APP_URL).toString());
  const name =
    cards.length === 1 ? `Kartu-Kode-${cards[0]!.label}` : `Kartu-Kode-${cards.length}-responden`;
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}.pdf"`,
      // Berisi kode akses: jangan pernah disimpan di cache.
      "Cache-Control": "no-store",
    },
  });
});
