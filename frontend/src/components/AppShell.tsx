import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import type { Role } from "../lib/types";

interface ImpersonateCandidato {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

// Nomeados "Exemplo" pelo seed (contas de teste) — aparecem primeiro na lista,
// pra facilitar o caso de uso mais comum (testar como o Supervisor/Colaborador de exemplo).
function ordenarCandidatos(a: ImpersonateCandidato, b: ImpersonateCandidato) {
  const aExemplo = a.name.toLowerCase().includes("exemplo");
  const bExemplo = b.name.toLowerCase().includes("exemplo");
  if (aExemplo !== bExemplo) return aExemplo ? -1 : 1;
  return a.name.localeCompare(b.name);
}

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
  const { user, logout, isImpersonating, viewAs, returnToMaster } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [candidatos, setCandidatos] = useState<ImpersonateCandidato[] | null>(null);
  const [loadingCandidatos, setLoadingCandidatos] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const podeVerComo = user?.role === "MASTER" && !isImpersonating;

  useEffect(() => {
    if (!menuOpen || candidatos || loadingCandidatos) return;
    setLoadingCandidatos(true);
    api
      .get<{ users: ImpersonateCandidato[] }>("/api/master/usuarios")
      .then((d) =>
        setCandidatos(d.users.filter((u) => (u.role === "SUPERVISOR" || u.role === "COLABORADOR") && u.active).sort(ordenarCandidatos))
      )
      .catch(() => setCandidatos([]))
      .finally(() => setLoadingCandidatos(false));
  }, [menuOpen, candidatos, loadingCandidatos]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  async function handleVerComo(id: string) {
    setSwitchError(null);
    setSwitching(id);
    try {
      await viewAs(id);
      setMenuOpen(false);
      navigate("/");
    } catch (e) {
      setSwitchError(e instanceof Error ? e.message : "Erro ao trocar de visão.");
    } finally {
      setSwitching(null);
    }
  }

  function handleVoltarParaMaster() {
    returnToMaster();
    navigate("/");
  }

  const supervisores = candidatos?.filter((c) => c.role === "SUPERVISOR") ?? [];
  const colaboradores = candidatos?.filter((c) => c.role === "COLABORADOR") ?? [];

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
            {isImpersonating ? (
              <span className="flex items-center gap-2 ml-2">
                <span
                  className="text-xs font-bold uppercase tracking-wide rounded-full px-2 py-0.5"
                  style={{ background: "rgba(245,158,11,.14)", color: "#f59e0b", border: "1px solid rgba(245,158,11,.4)" }}
                >
                  👁️ Vendo como {roleLabel}
                </span>
                <button
                  type="button"
                  onClick={handleVoltarParaMaster}
                  className="text-xs font-bold text-accent-2 hover:underline"
                >
                  ← Voltar para Master
                </button>
              </span>
            ) : podeVerComo ? (
              <span className="relative ml-2">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="text-xs uppercase tracking-wide text-ink-dim border border-line rounded-full px-2 py-0.5 hover:bg-white/5 hover:text-ink transition"
                  title="Ver como Supervisor ou Colaborador (teste)"
                >
                  {roleLabel} ▾
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                    <div className="absolute left-0 top-full mt-2 w-72 card p-3 z-30 shadow-xl flex flex-col gap-3 normal-case">
                      <div>
                        <p className="text-xs font-bold text-ink-dim uppercase tracking-wide mb-1">Ver como Supervisor</p>
                        {loadingCandidatos && <p className="text-xs text-ink-dim">Carregando...</p>}
                        {!loadingCandidatos && supervisores.length === 0 && (
                          <p className="text-xs text-ink-dim">Nenhum Supervisor ativo encontrado.</p>
                        )}
                        <ul className="flex flex-col gap-0.5 max-h-32 overflow-y-auto">
                          {supervisores.map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                disabled={switching === c.id}
                                onClick={() => handleVerComo(c.id)}
                                className="w-full text-left text-sm rounded-lg px-2 py-1.5 hover:bg-white/5 disabled:opacity-50"
                              >
                                {c.name}
                                <span className="block text-[.65rem] text-ink-dim">{c.email}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-ink-dim uppercase tracking-wide mb-1">Ver como Colaborador</p>
                        {loadingCandidatos && <p className="text-xs text-ink-dim">Carregando...</p>}
                        {!loadingCandidatos && colaboradores.length === 0 && (
                          <p className="text-xs text-ink-dim">Nenhum Colaborador ativo encontrado.</p>
                        )}
                        <ul className="flex flex-col gap-0.5 max-h-32 overflow-y-auto">
                          {colaboradores.map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                disabled={switching === c.id}
                                onClick={() => handleVerComo(c.id)}
                                className="w-full text-left text-sm rounded-lg px-2 py-1.5 hover:bg-white/5 disabled:opacity-50"
                              >
                                {c.name}
                                <span className="block text-[.65rem] text-ink-dim">{c.email}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {switchError && <p className="text-xs text-accent-3">{switchError}</p>}
                    </div>
                  </>
                )}
              </span>
            ) : (
              <span className="text-xs uppercase tracking-wide text-ink-dim ml-2 border border-line rounded-full px-2 py-0.5">
                {roleLabel}
              </span>
            )}
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
