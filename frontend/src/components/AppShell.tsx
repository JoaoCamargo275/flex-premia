import { Link, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../lib/auth-context";

export function AppShell({
  roleLabel,
  links,
  children,
  headerExtra,
}: {
  roleLabel: string;
  links: { href: string; label: string }[];
  children: ReactNode;
  /** Conteúdo extra renderizado ao lado do badge de papel (ex.: seletor de mês do colaborador). */
  headerExtra?: ReactNode;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line sticky top-0 z-10 bg-[rgba(10,9,18,0.92)] backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 shrink-0"
              style={{
                background: "var(--grad)",
                clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
              }}
            />
            <span className="font-extrabold">
              Flex
              <span
                style={{
                  background: "var(--grad)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Premia
              </span>
            </span>
            <span className="text-xs uppercase tracking-wide text-ink-dim ml-2 border border-line rounded-full px-2 py-0.5">
              {roleLabel}
            </span>
            {headerExtra}
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {links.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                className="text-sm font-semibold text-ink-dim hover:text-ink px-3 py-1.5 rounded-lg hover:bg-white/5 whitespace-nowrap"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-ink-dim hidden sm:inline">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-ink-dim hover:text-ink border border-line rounded-lg px-3 py-1.5"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
