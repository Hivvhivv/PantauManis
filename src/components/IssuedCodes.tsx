"use client";

import Link from "next/link";
import { useState } from "react";

export type IssuedCodeView = { id: string; label: string; codeForCard: string };

/** Menampilkan kode yang baru dibuat/di-reset agar bisa disalin atau dicetak. */
export function IssuedCodes({ items, title }: { items: IssuedCodeView[]; title: string }) {
  const [copied, setCopied] = useState(false);
  const text = items.map((i) => `${i.label}\t${i.codeForCard}`).join("\n");
  const printHref = `/admin/responden/cetak?${items.map((i) => `id=${i.id}`).join("&")}`;

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="card stack" aria-live="polite">
      <h2 style={{ margin: 0 }}>{title}</h2>
      <div className="table-wrap">
        <table style={{ minWidth: 0 }}>
          <thead>
            <tr>
              <th scope="col">ID Responden</th>
              <th scope="col">Kode Akses</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.label}</td>
                <td className="mono" style={{ fontSize: "1.1rem" }}>
                  {i.codeForCard}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row">
        <button type="button" className="btn" onClick={copyAll}>
          {items.length > 1 ? "Salin semua" : "Salin kode"}
        </button>
        {items.length <= 200 && (
          <Link className="btn" href={printHref}>
            Cetak kartu
          </Link>
        )}
        <Link className="btn" href="/admin/responden">
          Kembali ke List Responden
        </Link>
        {copied && (
          <span className="small muted" role="status">
            Tersalin
          </span>
        )}
      </div>
    </section>
  );
}
