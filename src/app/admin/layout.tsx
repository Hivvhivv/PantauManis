import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { Logo } from "@/components/Logo";
import { staffForPage } from "@/server/auth/page-guards";
import { openAlerts } from "@/server/modules/security-alerts";
import { ROLE_LABELS } from "@/lib/format";
import { SecurityAlertBanner } from "./SecurityAlertBanner";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await staffForPage();
  const isSuper = user.role === "superadmin";
  const alerts = isSuper ? await openAlerts() : [];

  return (
    <>
      <header className="topbar">
        <div className="container">
          <Logo />
          <nav aria-label="Menu utama">
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/responden">List Responden</Link>
            <Link href="/admin/referensi-minuman">Referensi Minuman</Link>
            {isSuper && <Link href="/admin/pengguna">Manajemen Pengguna</Link>}
            {isSuper && <Link href="/admin/pengaturan">Pengaturan</Link>}
          </nav>
          <span className="spacer" />
          <span className="small muted">
            {user.name} · {ROLE_LABELS[user.role]}
          </span>
          <Link className="btn btn-sm" href="/staf/ganti-kata-sandi">
            Ganti kata sandi
          </Link>
          <LogoutButton kind="staff" />
        </div>
      </header>
      <main className="container stack">
        {alerts.map((a) => (
          <SecurityAlertBanner
            key={a.id}
            id={a.id}
            createdAt={a.createdAt.toISOString()}
            failures={Number((a.details as { failures?: number } | null)?.failures ?? 0)}
          />
        ))}
        {children}
      </main>
    </>
  );
}
