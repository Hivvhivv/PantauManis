"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

/** Cetak kartu potong lewat dialog browser; judul dokumen menjadi nama file bawaan. */
function printCards(fileName: string) {
  const title = document.title;
  document.title = fileName;
  const restore = () => {
    document.title = title;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}

export function CardActions({
  fileName,
  pdfHref,
  code,
}: {
  fileName: string;
  /** PDF dibuat di server (satu halaman A4 per responden), langsung terunduh. */
  pdfHref: string;
  code: string | null;
}) {
  return (
    <div className="stack card-actions">
      <button type="button" className="btn btn-primary btn-lg" onClick={() => printCards(fileName)}>
        <Icon name="printer" /> Cetak Kartu
      </button>
      <a className="btn btn-lg" href={pdfHref} download>
        <Icon name="download" /> Download PDF
      </a>
      {code && <CopyButton text={code} label="Salin Kode" large />}
      <div className="security-note">
        <Icon name="shield" />
        <div>
          <strong>Keamanan</strong>
          <p className="small" style={{ margin: "0.2rem 0 0" }}>
            Kartu kode bersifat pribadi. Jangan bagikan kepada orang lain dan simpan di tempat aman.
          </p>
        </div>
      </div>
    </div>
  );
}

export function CopyButton({
  text,
  label,
  large = false,
}: {
  text: string;
  label: string;
  large?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard diblokir browser: kode tetap terlihat di kartu untuk disalin manual.
    }
  }
  return large ? (
    <button type="button" className="btn btn-lg" onClick={copy} aria-live="polite">
      <Icon name="copy" /> {copied ? "Kode tersalin" : label}
    </button>
  ) : (
    <button
      type="button"
      className="copy-chip no-print"
      onClick={copy}
      aria-label={copied ? "Kode tersalin" : label}
      title={copied ? "Kode tersalin" : label}
    >
      <Icon name={copied ? "check" : "copy"} size={18} />
    </button>
  );
}
