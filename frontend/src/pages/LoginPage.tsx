import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { ROLE_HOME } from "../components/ProtectedRoute";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const user = await login(email, password);
      navigate(location.state?.from || ROLE_HOME[user.role], { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6 min-h-screen">
      <div className="w-full max-w-sm card p-8">
        <div className="flex items-center gap-2 mb-6">
          <div
            className="w-7 h-7 shrink-0"
            style={{
              background: "var(--grad)",
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            }}
          />
          <div className="text-lg font-extrabold">
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
          </div>
        </div>

        <h1 className="text-xl font-bold mb-1">Entrar</h1>
        <p className="text-sm text-ink-dim mb-6">Acesse com seu e-mail e senha.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-xs uppercase tracking-wide text-ink-dim">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              className="input"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-xs uppercase tracking-wide text-ink-dim">
                Senha
              </label>
              <button
                type="button"
                onClick={() => navigate("/esqueci-minha-senha")}
                className="text-xs font-semibold text-accent-2 hover:text-accent"
                tabIndex={-1}
              >
                Esqueceu a senha?
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={mostrarSenha ? "text" : "password"}
                required
                className="input pr-10"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                className="absolute right-0 top-0 h-full px-3 flex items-center text-ink-dim hover:text-ink"
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                tabIndex={-1}
              >
                {mostrarSenha ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-5 0-9.27-3.11-11-7.5a11.6 11.6 0 0 1 2.94-4.19M9.9 4.24A10.9 10.9 0 0 1 12 4c5 0 9.27 3.11 11 7.5a11.6 11.6 0 0 1-1.66 2.87M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-7.5 11-7.5S23 12 23 12s-4 7.5-11 7.5S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-accent-3">{error}</p>}
          <button type="submit" disabled={pending} className="btn-grad mt-2 disabled:opacity-60">
            {pending ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
