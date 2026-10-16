import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { pageActor, staffForPage } from "@/server/auth/page-guards";
import { env } from "@/server/env";
import { cardsData } from "@/server/modules/respondents/service";
import { CardActions, CopyButton } from "./CardActions";

export const metadata: Metadata = { title: "Cetak Kartu Kode" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Card = Awaited<ReturnType<typeof cardsData>>[number];

/**
 * Kartu kode: kode, tautan website, dan instruksi singkat. QR hanya berisi tautan halaman masuk,
 * tanpa kode, supaya kode tidak tersimpan di riwayat browser atau log server (ADR-004).
 * "Cetak Kartu" mencetak kartu potong; "Download PDF" mencetak lembar A4 per responden.
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
  const qr = await QRCode.toDataURL(loginUrl, { margin: 1, width: 240 });
  const cards = await cardsData(await pageActor(user), ids);
  const single = cards.length === 1 ? cards[0]! : null;
  const fileName = single ? `Kartu-Kode-${single.label}` : `Kartu-Kode-${cards.length}-responden`;

  return (
    <>
      <nav className="crumbs small no-print" aria-label="Lokasi halaman">
        <Link href="/admin" aria-label="Dashboard">
          <Icon name="home" size={16} />
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/admin/responden">List Responden</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Cetak Kartu Kode</span>
      </nav>
      <div className="no-print">
        <h1 style={{ margin: 0 }}>Cetak Kartu Kode</h1>
        <p className="muted" style={{ margin: "0.35rem 0 0" }}>
          Kartu kode dipakai responden untuk masuk ke PantauManis. Hanya responden dengan akses
          aktif yang dicetak ({cards.length} kartu). Simpan kartu di tempat aman.
        </p>
      </div>

      {cards.length === 0 ? (
        <p className="card muted">Tidak ada responden aktif untuk dicetak.</p>
      ) : (
        <div className="print-layout">
          <div className="id-cards">
            {cards.map((c) => (
              <IdCard key={c.id} card={c} qr={qr} loginUrl={loginUrl} />
            ))}
          </div>
          <aside className="no-print">
            <CardActions fileName={fileName} code={single?.codeForCard ?? null} />
          </aside>
        </div>
      )}

      {/* Template PDF A4: hanya tampil saat "Download PDF". */}
      <div className="a4-sheets" aria-hidden="true">
        {cards.map((c) => (
          <section key={c.id} className="a4-sheet">
            <span className="a4-leaf tl" />
            <span className="a4-leaf br" />
            <header className="a4-head">
              <Logo size={44} tagline="Pantau minuman manis harian" />
              <h2>Kartu Kode Responden</h2>
              <p>Gunakan kartu ini untuk masuk dan mengisi kuesioner PantauManis.</p>
            </header>
            <IdCard card={c} qr={qr} loginUrl={loginUrl} printOnly />
            <footer className="a4-foot">
              <strong>PantauManis</strong>
              <span>Satu catatan kecil setiap hari membantu penelitian ini.</span>
            </footer>
          </section>
        ))}
      </div>
    </>
  );
}

function IdCard({
  card,
  qr,
  loginUrl,
  printOnly = false,
}: {
  card: Card;
  qr: string;
  loginUrl: string;
  printOnly?: boolean;
}) {
  return (
    <article className="id-card">
      <header className="id-card-head">
        <Logo size={30} />
        <span className="id-pill">ID: {card.label}</span>
      </header>
      <div>
        <div className="id-card-label">Kode Akses Responden</div>
        <div className="id-code">
          <span className="mono">{card.codeForCard}</span>
          {!printOnly && <CopyButton text={card.codeForCard} label={`Salin kode ${card.label}`} />}
        </div>
      </div>
      <div className="id-card-body">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt={`QR menuju ${loginUrl}`} className="id-qr" />
        <ol className="id-steps">
          <li>
            <span>
              Buka laman <span className="id-url">{loginUrl}</span> atau pindai QR.
            </span>
          </li>
          <li>
            <span>Masukkan kode akses di atas.</span>
          </li>
          <li>
            <span>Jangan bagikan kode ini kepada orang lain.</span>
          </li>
        </ol>
      </div>
    </article>
  );
}
