"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";

type Item = { href: string; label: string; icon: IconName; superOnly?: boolean };

const ITEMS: Item[] = [
  { href: "/admin", label: "Dashboard", icon: "grid" },
  { href: "/admin/responden", label: "List Responden", icon: "users" },
  { href: "/admin/referensi-minuman", label: "Referensi Minuman", icon: "drop" },
  { href: "/admin/edukasi", label: "Materi Edukasi", icon: "book" },
  { href: "/admin/kuesioner", label: "Kuesioner", icon: "clipboard" },
  { href: "/admin/pengguna", label: "Manajemen Pengguna", icon: "userCog", superOnly: true },
  { href: "/admin/pengaturan", label: "Pengaturan", icon: "settings", superOnly: true },
];

/** Menu staf: ikon di atas label, menu aktif disorot. Menu Superadmin tetap dijaga di server. */
export function AdminNav({ isSuper }: { isSuper: boolean }) {
  const path = usePathname();
  const active = (href: string) =>
    href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`);
  return (
    <nav className="admin-nav" aria-label="Menu utama">
      {ITEMS.filter((i) => isSuper || !i.superOnly).map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={active(i.href) ? "on" : undefined}
          aria-current={active(i.href) ? "page" : undefined}
        >
          <Icon name={i.icon} size={20} />
          <span>{i.label}</span>
        </Link>
      ))}
    </nav>
  );
}
