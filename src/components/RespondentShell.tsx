import { LogoutButton } from "./LogoutButton";
import { Logo } from "./Logo";
import { RespondentNav } from "./RespondentNav";

/**
 * Kerangka halaman responden (mobile-first). `nav` hanya untuk responden yang sudah pretest;
 * `wide` dipakai halaman dashboard agar memenuhi lebar layar desktop.
 */
export function RespondentShell({
  children,
  nav = true,
  wide = false,
  label,
}: {
  children: React.ReactNode;
  nav?: boolean;
  wide?: boolean;
  /** ID Responden untuk chip akun di header. */
  label?: string;
}) {
  return (
    <>
      <header className="resp-header">
        <div className="inner wide">
          <Logo />
          {nav && <RespondentNav />}
          <div className="account">
            {label && (
              <span className="account-chip">
                <span className="avatar" aria-hidden="true">
                  {label.slice(0, 1)}
                </span>
                {label}
              </span>
            )}
            <LogoutButton kind="respondent" />
          </div>
        </div>
      </header>
      <main className={`resp-main stack${wide ? " wide" : ""}${nav ? " has-bottom-nav" : ""}`}>
        {children}
      </main>
    </>
  );
}
