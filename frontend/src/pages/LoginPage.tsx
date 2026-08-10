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
            <label htmlFor="password" className="text-xs uppercase tracking-wide text-ink-dim">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              className="input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
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
