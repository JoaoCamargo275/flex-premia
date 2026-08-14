import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

// Não há envio de e-mail configurado no sistema — esta tela só registra o
// pedido, que fica visível pro Supervisor (ou Master, se quem esqueceu for
// um Supervisor) no painel deles, pra resetarem a senha manualmente.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await api.post("/api/auth/solicitar-reset-senha", { email: email.trim() });
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar o pedido.");
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

        <h1 className="text-xl font-bold mb-1">Esqueceu a senha?</h1>

        {enviado ? (
          <>
            <p className="text-sm text-ink-dim mb-6">
              Se esse e-mail estiver cadastrado no sistema, seu Supervisor (ou o Master, caso você seja Supervisor)
              foi avisado e vai te passar uma nova senha em breve. Não há redefinição automática por e-mail —
              combine com ele(a) a melhor forma de receber a nova senha.
            </p>
            <Link to="/login" className="text-sm font-semibold text-accent-2 hover:text-accent">
              ← Voltar para o login
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-dim mb-6">
              Informe o e-mail da sua conta. Não enviamos link por e-mail — o pedido fica registrado para o seu
              Supervisor (ou Master) resetar sua senha e te passar uma nova.
            </p>
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
              {error && <p className="text-sm text-accent-3">{error}</p>}
              <button type="submit" disabled={pending} className="btn-grad mt-2 disabled:opacity-60">
                {pending ? "Enviando..." : "Avisar meu Supervisor"}
              </button>
              <Link to="/login" className="text-sm text-ink-dim hover:text-ink text-center">
                ← Voltar para o login
              </Link>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
