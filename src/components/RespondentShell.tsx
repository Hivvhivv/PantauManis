import { LogoutButton } from "./LogoutButton";
import { Logo } from "./Logo";
import { RespondentNav } from "./RespondentNav";

/** Kerangka halaman responden (mobile-first). `nav` hanya untuk responden yang sudah pretest. */
export function RespondentShell({
  children,
  nav = true,
}: {
  children: React.ReactNode;
  nav?: boolean;
}) {
  return (
    <>
      <header className="resp-header">
        <div className="inner">
          <Logo />
          {nav && <RespondentNav />}
          <LogoutButton kind="respondent" />
        </div>
      </header>
      <main className={`resp-main stack${nav ? " has-bottom-nav" : ""}`}>{children}</main>
    </>
  );
}
