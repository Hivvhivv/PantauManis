"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * Dua mode cetak lewat dialog browser:
 * - "card": kartu potong (beberapa per halaman), untuk dicetak di kertas.
 * - "a4":   satu lembar A4 per responden (template PDF); pilih "Simpan sebagai PDF".
 */
function printAs(mode: "card" | "a4", fileName: string) {
  const html = document.documentElement;
  const title = document.title;
  html.dataset.print = mode;
  document.title = fileName; // nama file bawaan saat "Simpan sebagai PDF"
  const restore = () => {
    delete html.dataset.print;
    document.title = title;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}

export function CardActions({ fileName, code }: { fileName: string; code: string | null }) {
  return (
    <div className="stack card-actions">
      <button
        type="button"
        className="btn btn-primary btn-lg"
        onClick={() => printAs("card", fileName)}
      >
        <Icon name="printer" /> Cetak Kartu
      </button>
      <button type="button" className="btn btn-lg" onClick={() => printAs("a4", fileName)}>
        <Icon name="download" /> Download PDF
      </button>
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
