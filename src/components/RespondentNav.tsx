"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

const ITEMS: { href: string; label: string; short?: string; icon: IconName }[] = [
  { href: "/beranda", label: "Beranda", icon: "home" },
  { href: "/catat", label: "Catat Minuman", short: "Catat", icon: "cup" },
  { href: "/riwayat", label: "Riwayat", icon: "clock" },
  { href: "/edukasi", label: "Edukasi", icon: "book" },
  { href: "/target", label: "Target", icon: "target" },
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
            <Icon name={i.icon} />
            <span className={i.short ? "nav-long" : undefined}>{i.label}</span>
            {i.short && <span className="nav-short">{i.short}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
