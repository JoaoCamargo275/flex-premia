import { fmtBRL, fmtNum } from "../lib/format";
import type { ProdutoBreakdownItem, ProdutosPorFrente } from "../lib/premiacao-types";

const FRENTES: { key: keyof ProdutosPorFrente; label: string; icon: string; isValor?: boolean }[] = [
  { key: "mv", label: "RENOV. MV", icon: "📱" },
  { key: "fbava", label: "RENOV. FB/AVA", icon: "🔄" },
  { key: "altas", label: "ALTAS", icon: "🚀" },
  { key: "aparelhos", label: "Aparelhos", icon: "💰", isValor: true },
];

function ProdutoRow({ item, isValor }: { item: ProdutoBreakdownItem; isValor?: boolean }) {
  const qtdLabel = isValor ? "" : "x";
  return (
    <li className="flex items-center justify-between gap-2 py-1.5 border-b border-white/5 last:border-0 text-sm">
      <span className="text-ink truncate">{item.label}</span>
      <span className="text-right shrink-0">
        {isValor ? (
          <>
            <span className="font-semibold text-good">{fmtBRL(item.valorAtivado)}</span>
            <span className="text-xs text-ink-dim"> / {fmtBRL(item.valorLancado)} lançado</span>
          </>
        ) : (
          <>
            <span className="font-semibold text-good">
              {qtdLabel}
              {fmtNum(item.qtdAtivada)} ativado
            </span>
            <span className="text-xs text-ink-dim">
              {" "}
              / {qtdLabel}
              {fmtNum(item.qtdLancada)} lançado
            </span>
          </>
        )}
      </span>
    </li>
  );
}

export function ProdutosPorFrenteCard({ produtos }: { produtos: ProdutosPorFrente }) {
  return (
    <div className="card p-4">
      <h2 className="text-sm font-bold mb-3">Produtos vendidos por frente</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FRENTES.map((f) => {
          const items = produtos[f.key];
          return (
            <div key={f.key} className="rounded-lg bg-white/[.02] p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-ink-dim mb-1.5">
                {f.icon} {f.label}
              </div>
              {items.length === 0 ? (
                <p className="text-xs text-ink-dim">Nenhum produto registrado nesta frente.</p>
              ) : (
                <ul>
                  {items.map((item) => (
                    <ProdutoRow key={item.label} item={item} isValor={f.isValor} />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
