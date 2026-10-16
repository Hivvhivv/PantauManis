import Link from "next/link";
import { Icon } from "@/components/Icon";
import { AdminNav } from "./AdminNav";
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
        <div className="container topbar-inner">
          <Logo tagline="Pantau minuman manis harian" />
          <AdminNav isSuper={isSuper} />
          <details className="user-menu">
            <summary>
              <span className="avatar" aria-hidden="true">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="user-menu-text">
                <strong>{user.name}</strong>
                <span className="small muted">{ROLE_LABELS[user.role]}</span>
              </span>
              <Icon name="chevronDown" size={16} />
            </summary>
            <div className="user-menu-panel card stack">
              <Link className="btn btn-sm" href="/staf/ganti-kata-sandi">
                <Icon name="key" size={16} /> Ganti kata sandi
              </Link>
              <LogoutButton kind="staff" />
            </div>
          </details>
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
