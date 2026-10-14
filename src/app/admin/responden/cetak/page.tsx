import type { Metadata } from "next";
import QRCode from "qrcode";
import { pageActor, staffForPage } from "@/server/auth/page-guards";
import { env } from "@/server/env";
import { cardsData } from "@/server/modules/respondents/service";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = { title: "Cetak Kartu Kode" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Kartu kode: kode, tautan website, dan instruksi singkat. QR hanya berisi tautan halaman masuk,
 * tanpa kode, supaya kode tidak tersimpan di riwayat browser atau log server (ADR-004).
 */
export default async function PrintCardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await staffForPage();
  const raw = (await searchParams).id;
  const ids = (Array.isArray(raw) ? raw : raw ? [raw] : [])
    .filter((x) => UUID_RE.test(x))
    .slice(0, 200);

  const loginUrl = new URL("/masuk", env().APP_URL).toString();
  const qr = await QRCode.toDataURL(loginUrl, { margin: 1, width: 192 });
  const cards = await cardsData(await pageActor(user), ids);

  return (
    <>
      <div className="row spread no-print">
        <h1 style={{ margin: 0 }}>Cetak Kartu Kode</h1>
        <PrintButton />
      </div>
      <p className="muted no-print">
        {cards.length} kartu. Hanya responden dengan akses aktif yang dicetak. Simpan kartu di
        tempat aman.
      </p>
      <div className="cards">
        {cards.map((c) => (
          <article key={c.id} className="code-card stack">
            <div className="row spread">
              <strong>PantauManis</strong>
              <span className="small">ID: {c.label}</span>
            </div>
            <div>
              <div className="small muted">Kode akses Anda</div>
              <div className="code mono">{c.codeForCard}</div>
            </div>
            <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt={`QR menuju ${loginUrl}`} />
              <ol className="small" style={{ margin: 0, paddingLeft: "1.1rem" }}>
                <li>Buka {loginUrl} atau pindai QR.</li>
                <li>Masukkan kode akses di atas.</li>
                <li>Jangan bagikan kode ini kepada orang lain.</li>
              </ol>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
