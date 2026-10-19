import "server-only";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";

/**
 * PDF kartu kode: satu halaman A4 per responden, mengikuti template "Kartu Kode Responden".
 * Dibuat di server agar tombol "Download PDF" langsung mengunduh file (tanpa dialog cetak).
 * Font standar PDF (Helvetica/Courier): hanya karakter Latin, tanpa emoji.
 * QR hanya berisi tautan halaman masuk, tanpa kode akses (ADR-004).
 */
export type PdfCard = { label: string; codeForCard: string };

const C = {
  bg: rgb(1, 0.98, 0.953),
  leaf: rgb(0.953, 0.89, 0.816),
  brown: rgb(0.612, 0.357, 0.18),
  text: rgb(0.227, 0.173, 0.133),
  muted: rgb(0.431, 0.361, 0.306),
  soft: rgb(0.953, 0.89, 0.816),
  dash: rgb(0.788, 0.541, 0.333),
  white: rgb(1, 1, 1),
  green: rgb(0.541, 0.604, 0.357),
};
const W = 595.28;
const H = 841.89;

/** Kotak bersudut bulat dalam koordinat PDF (y dari bawah). */
function roundRect(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  opts: { fill?: ReturnType<typeof rgb>; border?: ReturnType<typeof rgb>; dash?: number[] },
) {
  const path =
    `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} ` +
    `H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`;
  // drawSvgPath memakai sumbu y ke bawah dari titik (x, y) → geser ke sudut kiri atas.
  page.drawSvgPath(path, {
    x,
    y: y + h,
    color: opts.fill,
    borderColor: opts.border,
    borderWidth: opts.border ? 1.5 : 0,
    borderDashArray: opts.dash,
  });
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function centered(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = C.text,
) {
  page.drawText(text, { x: (W - font.widthOfTextAtSize(text, size)) / 2, y, size, font, color });
}

/** Logo sederhana: tetesan (lingkaran + segitiga) dengan daun, lalu nama. */
function logo(
  page: PDFPage,
  x: number,
  y: number,
  s: number,
  bold: PDFFont,
  regular: PDFFont,
  tagline?: string,
) {
  page.drawCircle({ x: x + s / 2, y: y + s * 0.38, size: s * 0.36, color: C.brown });
  page.drawSvgPath(`M ${s * 0.18} ${s * 0.55} L ${s * 0.5} 0 L ${s * 0.82} ${s * 0.55} Z`, {
    x,
    y: y + s,
    color: C.brown,
  });
  page.drawEllipse({
    x: x + s * 0.8,
    y: y + s * 0.9,
    xScale: s * 0.2,
    yScale: s * 0.09,
    color: C.green,
  });
  page.drawText("PantauManis", {
    x: x + s + 8,
    y: y + (tagline ? s * 0.45 : s * 0.25),
    size: s * 0.55,
    font: bold,
    color: C.brown,
  });
  if (tagline) {
    page.drawText(tagline, {
      x: x + s + 8,
      y: y + s * 0.05,
      size: s * 0.3,
      font: regular,
      color: C.muted,
    });
  }
}

export async function cardsPdf(cards: PdfCard[], loginUrl: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(cards.length === 1 ? `Kartu Kode ${cards[0]!.label}` : "Kartu Kode Responden");
  doc.setCreator("PantauManis");
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const mono = await doc.embedFont(StandardFonts.CourierBold);
  const qr = await doc.embedPng(await QRCode.toBuffer(loginUrl, { margin: 1, width: 360 }));

  for (const card of cards) {
    const page = doc.addPage([W, H]);
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg });
    page.drawEllipse({ x: 30, y: H - 30, xScale: 150, yScale: 150, color: C.leaf, opacity: 0.8 });
    page.drawEllipse({ x: W - 30, y: 30, xScale: 150, yScale: 150, color: C.leaf, opacity: 0.8 });

    // Kepala halaman
    const logoW = 30 + 8 + bold.widthOfTextAtSize("PantauManis", 16.5);
    logo(page, (W - logoW) / 2, H - 110, 30, bold, regular, "Pantau minuman manis harian");
    centered(page, "Kartu Kode Responden", H - 160, bold, 26);
    centered(
      page,
      "Gunakan kartu ini untuk masuk dan mengisi kuesioner PantauManis.",
      H - 185,
      regular,
      11.5,
      C.muted,
    );

    // Kartu
    const cw = 400;
    const ch = 330;
    const cx = (W - cw) / 2;
    const cy = H - 220 - ch;
    roundRect(page, cx, cy, cw, ch, 18, { fill: C.white, border: C.dash, dash: [5, 4] });
    const pad = 22;
    logo(page, cx + pad, cy + ch - pad - 22, 22, bold, regular);
    const idText = `ID: ${card.label}`;
    const idW = bold.widthOfTextAtSize(idText, 11) + 24;
    roundRect(page, cx + cw - pad - idW, cy + ch - pad - 24, idW, 24, 12, {
      fill: C.white,
      border: C.soft,
    });
    page.drawText(idText, {
      x: cx + cw - pad - idW + 12,
      y: cy + ch - pad - 16,
      size: 11,
      font: bold,
      color: C.text,
    });

    page.drawText("Kode Akses Responden", {
      x: cx + pad,
      y: cy + ch - 78,
      size: 10.5,
      font: bold,
      color: C.muted,
    });
    roundRect(page, cx + pad, cy + ch - 142, cw - pad * 2, 54, 12, { fill: C.soft });
    page.drawText(card.codeForCard, {
      x: cx + pad + 16,
      y: cy + ch - 125,
      size: 30,
      font: mono,
      color: C.text,
    });

    // QR + langkah
    const qrSize = 104;
    // Di bawah kotak kode (kotak kode berakhir 142 pt dari atas kartu), jarak 16 pt.
    const qrY = cy + ch - 142 - 16 - (qrSize + 6);
    roundRect(page, cx + pad, qrY - 6, qrSize + 12, qrSize + 12, 10, {
      fill: C.white,
      border: C.soft,
    });
    page.drawImage(qr, { x: cx + pad + 6, y: qrY, width: qrSize, height: qrSize });
    const steps = [
      `Buka laman ${loginUrl} atau pindai QR.`,
      "Masukkan kode akses di atas.",
      "Jangan bagikan kode ini kepada orang lain.",
    ];
    const sx = cx + pad + qrSize + 32;
    let sy = qrY + qrSize - 6;
    steps.forEach((step, i) => {
      page.drawCircle({ x: sx + 8, y: sy + 3, size: 9, color: C.soft });
      page.drawText(String(i + 1), {
        x: sx + 5,
        y: sy - 0.5,
        size: 10,
        font: bold,
        color: C.brown,
      });
      for (const line of wrap(step, regular, 10, cw - (sx - cx) - pad - 26)) {
        page.drawText(line, { x: sx + 24, y: sy, size: 10, font: regular, color: C.text });
        sy -= 13;
      }
      sy -= 8;
    });

    page.drawLine({
      start: { x: cx + pad, y: cy + 42 },
      end: { x: cx + cw - pad, y: cy + 42 },
      thickness: 0.8,
      color: C.soft,
      dashArray: [3, 3],
    });
    page.drawText(
      "Pasang di HP: setelah laman terbuka, pilih Tambahkan ke layar utama di menu browser.",
      {
        x: cx + pad,
        y: cy + 22,
        size: 8.5,
        font: regular,
        color: C.muted,
      },
    );

    // Kaki halaman
    centered(page, "PantauManis", 70, bold, 11, C.brown);
    centered(
      page,
      "Satu catatan kecil setiap hari membantu penelitian ini.",
      54,
      regular,
      9.5,
      C.muted,
    );
  }
  return doc.save();
}
