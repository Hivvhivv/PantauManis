"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/beranda", label: "Beranda", icon: "🏠" },
  { href: "/catat", label: "Catat", icon: "＋" },
  { href: "/riwayat", label: "Riwayat", icon: "📋" },
];

/** Di ponsel tampil sebagai bar bawah; di layar lebar di header. */
export function RespondentNav() {
  const path = usePathname();
  return (
    <nav className="resp-nav" aria-label="Menu responden">
      {ITEMS.map((i) => {
        const active = path === i.href || path.startsWith(`${i.href}/`);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}>
            <span aria-hidden="true">{i.icon}</span>
            <span>{i.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
