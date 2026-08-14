import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { SALE_STATUS_SUGESTOES } from "../../lib/types";
import type { CatalogData, CatalogItemRow } from "./VendaCart";

// Ações de UM PRODUTO da venda — cada item tem seu próprio status e flag de
// ativação, já que produtos da mesma venda costumam ativar em datas
// diferentes (ver backend: SaleItem.status / SaleItem.ativo).
export function SaleItemActions({
  saleId,
  itemId,
  status,
  ativo,
  cancelado,
  onChanged,
}: {
  saleId: string;
  itemId: string;
  status: string;
  ativo: boolean;
  cancelado: boolean;
  onChanged: () => void;
}) {
  const [statusTexto, setStatusTexto] = useState(status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const datalistId = `status-sugestoes-${itemId}`;

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    setPending(true);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar produto.");
    } finally {
      setPending(false);
    }
  }

  const statusMudou = statusTexto.trim() !== status.trim() && statusTexto.trim().length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
        <input
          list={datalistId}
          className="input py-1 text-xs flex-1"
          value={statusTexto}
          disabled={pending || cancelado}
          onChange={(e) => setStatusTexto(e.target.value)}
          placeholder="Situação deste produto..."
        />
        <datalist id={datalistId}>
          {SALE_STATUS_SUGESTOES.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {statusMudou && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => api.patch(`/api/sales/${saleId}/items/${itemId}/status`, { status: statusTexto.trim() }))}
            className="text-xs font-bold text-accent shrink-0"
          >
            Salvar
          </button>
        )}
      </div>

      <label className="flex items-center gap-1.5 text-xs cursor-pointer shrink-0">
        <input
          type="checkbox"
          checked={ativo}
          disabled={pending || cancelado}
          onChange={(e) => run(() => api.patch(`/api/sales/${saleId}/items/${itemId}/ativo`, { ativo: e.target.checked }))}
        />
        Ativo
      </label>

      {error && <p className="text-xs text-accent-3 w-full">{error}</p>}
    </div>
  );
}

// Corrige a quantidade (ou, pra Aparelhos, o valor em R$) de um item que
// já foi lançado na venda — cobre o "digitei errado" sem precisar excluir
// e refazer a venda inteira. Só aparece enquanto o item não está ativo
// (depois de ativo, o backend bloqueia a edição).
export function EditQuantityInline({
  saleId,
  itemId,
  indicator,
  quantity,
  valorReais,
  ativo,
  onChanged,
}: {
  saleId: string;
  itemId: string;
  indicator: string;
  quantity: number;
  valorReais: number | null;
  ativo: boolean;
  onChanged: () => void;
}) {
  const isAparelho = indicator === "APARELHOS";
  const valorAtual = isAparelho ? valorReais ?? 0 : quantity;

  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(String(valorAtual));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function abrir() {
    setTexto(isAparelho ? String(valorAtual).replace(".", ",") : String(valorAtual));
    setError(null);
    setEditando(true);
  }

  function handleChange(raw: string) {
    if (isAparelho) {
      // aceita dígitos e uma vírgula decimal (mesmo padrão do campo de valor em "Nova venda")
      const limpo = raw.replace(/[^\d,]/g, "");
      setTexto(limpo);
    } else {
      setTexto(raw.replace(/\D/g, ""));
    }
  }

  async function salvar() {
    const numero = isAparelho ? parseFloat(texto.replace(",", ".")) : parseInt(texto, 10);
    if (!numero || numero <= 0) {
      setError("Informe um valor válido.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await api.patch(`/api/sales/${saleId}/items/${itemId}/quantidade`, { quantity: numero });
      setEditando(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar quantidade.");
    } finally {
      setPending(false);
    }
  }

  if (ativo) return null;

  if (!editando) {
    return (
      <button
        type="button"
        onClick={abrir}
        className="text-[.65rem] font-bold text-accent-2 hover:underline shrink-0"
        title="Editar quantidade"
      >
        ✎ Editar
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {isAparelho && <span className="text-xs text-ink-dim">R$</span>}
      <input
        type="text"
        inputMode={isAparelho ? "decimal" : "numeric"}
        value={texto}
        autoFocus
        onChange={(e) => handleChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        className="w-16 text-center bg-transparent border border-line rounded px-1 py-0.5 text-xs font-bold"
      />
      <button
        type="button"
        disabled={pending}
        onClick={salvar}
        className="text-[.65rem] font-bold text-good"
      >
        Salvar
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setEditando(false)}
        className="text-[.65rem] text-ink-dim"
      >
        Cancelar
      </button>
      {error && <span className="text-[.65rem] text-accent-3">{error}</span>}
    </div>
  );
}

// Remove um item que foi adicionado por engano — só some enquanto o item
// ainda não estiver ativo (mesma trava do backend).
export function RemoveItemButton({
  saleId,
  itemId,
  ativo,
  onChanged,
}: {
  saleId: string;
  itemId: string;
  ativo: boolean;
  onChanged: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ativo) return null;

  async function remover() {
    if (!confirm("Remover este produto da venda?")) return;
    setPending(true);
    setError(null);
    try {
      await api.delete(`/api/sales/${saleId}/items/${itemId}`);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover produto.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="flex items-center gap-1.5 shrink-0">
      <button type="button" disabled={pending} onClick={remover} className="text-[.65rem] font-bold text-accent-3">
        Remover
      </button>
      {error && <span className="text-[.65rem] text-accent-3">{error}</span>}
    </span>
  );
}

const FRENTES_CATALOGO = [
  { key: "RENOV_MV", label: "RENOV. MV" },
  { key: "RENOV_FB", label: "RENOV. FB" },
  { key: "RENOV_AVA_DADOS", label: "RENOV. AVA — Dados" },
  { key: "RENOV_AVA_VOZ", label: "RENOV. AVA — Voz" },
  { key: "ALTAS", label: "ALTAS" },
  { key: "APARELHOS", label: "Aparelhos" },
] as const;
type FrenteKey = (typeof FRENTES_CATALOGO)[number]["key"];

// Formulário compacto pra acrescentar um produto a uma venda (cliente) que
// já existe — evita ter que excluir e recriar a venda inteira quando um
// item foi esquecido na hora do lançamento original.
export function AddProductForm({ saleId, onChanged }: { saleId: string; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [frente, setFrente] = useState<FrenteKey>("RENOV_MV");
  const [catalogItemId, setCatalogItemId] = useState("");
  const [qtyTexto, setQtyTexto] = useState("1");
  const [aparelhoNome, setAparelhoNome] = useState("");
  const [aparelhoValor, setAparelhoValor] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || catalog) return;
    api
      .get<CatalogData>("/api/catalog")
      .then(setCatalog)
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Erro ao carregar catálogo."));
  }, [open, catalog]);

  const itensDaFrente: CatalogItemRow[] =
    frente === "ALTAS"
      ? catalog?.ALTAS.flatMap((cat) =>
          cat.items.map((item) => ({ ...item, label: `${cat.categoryIcon ?? ""} ${cat.categoryName} — ${item.label}` }))
        ) ?? []
      : frente === "APARELHOS"
      ? []
      : catalog?.[frente] ?? [];

  useEffect(() => {
    setCatalogItemId(itensDaFrente[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frente, catalog]);

  async function adicionar() {
    setError(null);
    try {
      if (frente === "APARELHOS") {
        const valor = parseFloat(aparelhoValor.replace(/\./g, "").replace(",", "."));
        if (!aparelhoNome.trim() || !valor || valor <= 0) {
          setError("Informe o aparelho e um valor válido.");
          return;
        }
        setPending(true);
        await api.post(`/api/sales/${saleId}/items`, {
          items: [{ indicator: "APARELHOS", label: aparelhoNome.trim(), quantity: valor }],
        });
        setAparelhoNome("");
        setAparelhoValor("");
      } else {
        const qty = parseInt(qtyTexto, 10);
        if (!catalogItemId || !qty || qty <= 0) {
          setError("Escolha um item e uma quantidade válida.");
          return;
        }
        setPending(true);
        await api.post(`/api/sales/${saleId}/items`, {
          items: [{ catalogItemId, indicator: frente, label: "", quantity: qty }],
        });
        setQtyTexto("1");
      }
      onChanged();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao adicionar produto.");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-bold text-accent-2 hover:underline">
        + Adicionar produto a esta venda
      </button>
    );
  }

  return (
    <div className="rounded-lg bg-white/[.03] p-3 flex flex-col gap-2">
      {loadError && <p className="text-xs text-accent-3">{loadError}</p>}
      {!catalog && !loadError && <p className="text-xs text-ink-dim">Carregando catálogo...</p>}
      {catalog && (
        <>
          <div className="flex flex-wrap gap-2">
            <select
              value={frente}
              onChange={(e) => setFrente(e.target.value as FrenteKey)}
              className="input py-1 text-xs w-auto"
            >
              {FRENTES_CATALOGO.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>

            {frente !== "APARELHOS" ? (
              <>
                <select
                  value={catalogItemId}
                  onChange={(e) => setCatalogItemId(e.target.value)}
                  className="input py-1 text-xs flex-1 min-w-[160px]"
                >
                  {itensDaFrente.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label} ({item.points} pts)
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  inputMode="numeric"
                  value={qtyTexto}
                  onChange={(e) => setQtyTexto(e.target.value.replace(/\D/g, ""))}
                  onFocus={(e) => e.target.select()}
                  className="input py-1 text-xs w-16 text-center"
                  placeholder="Qtd."
                />
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={aparelhoNome}
                  onChange={(e) => setAparelhoNome(e.target.value)}
                  placeholder="Ex.: iPhone 15"
                  className="input py-1 text-xs flex-1 min-w-[140px]"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={aparelhoValor}
                  onChange={(e) => setAparelhoValor(e.target.value.replace(/[^\d,.]/g, ""))}
                  placeholder="Valor (R$)"
                  className="input py-1 text-xs w-28"
                />
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button type="button" disabled={pending} onClick={adicionar} className="btn-grad py-1 px-3 text-xs">
              {pending ? "Adicionando..." : "Adicionar"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-ink-dim">
              Cancelar
            </button>
          </div>
          {error && <p className="text-xs text-accent-3">{error}</p>}
        </>
      )}
    </div>
  );
}

// Ações da venda como um todo: cancelar (zera a contagem de todos os
// produtos) e excluir (só permitido se nada ainda saiu do estado pendente).
export function SaleFooterActions({
  saleId,
  cancelado,
  podeExcluir,
  onChanged,
}: {
  saleId: string;
  cancelado: boolean;
  podeExcluir: boolean;
  onChanged: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    setPending(true);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar venda.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5">
      <label className="flex items-center gap-2 text-sm cursor-pointer text-accent-3">
        <input
          type="checkbox"
          checked={cancelado}
          disabled={pending}
          onChange={(e) => {
            if (e.target.checked && !confirm("Marcar esta venda inteira como cancelada? Todos os produtos param de contar pontos.")) return;
            run(() => api.patch(`/api/sales/${saleId}/cancelado`, { cancelado: e.target.checked }));
          }}
        />
        Cancelar venda inteira
      </label>

      {podeExcluir && (
        <button
          disabled={pending}
          onClick={() => {
            if (confirm("Excluir esta venda pendente?")) run(() => api.delete(`/api/sales/${saleId}`));
          }}
          className="text-xs text-accent-3 font-semibold ml-auto"
        >
          Excluir
        </button>
      )}

      {error && <p className="text-xs text-accent-3 w-full">{error}</p>}
    </div>
  );
}
