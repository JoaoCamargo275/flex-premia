import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { fmtBRL, fmtNum } from "../../lib/format";
import { maskCnpj, isValidCnpj } from "../../lib/cnpj";
import type { Indicator } from "../../lib/types";

interface CatalogItemRow {
  id: string;
  label: string;
  points: number;
  price: number | null;
}
interface CatalogGroup {
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  items: CatalogItemRow[];
}
export interface CatalogData {
  RENOV_MV: CatalogItemRow[];
  RENOV_FB: CatalogItemRow[];
  RENOV_AVA_DADOS: CatalogItemRow[];
  RENOV_AVA_VOZ: CatalogItemRow[];
  ALTAS: CatalogGroup[];
}

interface CartItemInput {
  catalogItemId?: string;
  indicator: Indicator;
  label: string;
  quantity: number;
}

type Tab = "mv" | "fbava" | "altas" | "aparelhos";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "mv", label: "RENOV. MV", emoji: "📱" },
  { id: "fbava", label: "RENOV. FB/AVA", emoji: "🔄" },
  { id: "altas", label: "ALTAS", emoji: "🚀" },
  { id: "aparelhos", label: "Aparelhos", emoji: "💰" },
];

function QtyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className="w-7 h-7 rounded-lg border border-line grid place-items-center"
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        −
      </button>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        className="w-12 text-center bg-transparent font-bold"
      />
      <button
        type="button"
        className="w-7 h-7 rounded-lg border border-line grid place-items-center"
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}

export function VendaCart({ catalog }: { catalog: CatalogData }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("mv");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [aparelhoValor, setAparelhoValor] = useState<string>("");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteCnpj, setClienteCnpj] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const setQtyFor = (id: string, v: number) => setQty((prev) => ({ ...prev, [id]: v }));

  const cartItems = useMemo(() => {
    const rows: { key: string; catalogItemId: string; indicator: Indicator; label: string; qty: number; points: number; subtotal: number }[] = [];

    const pushGroup = (indicator: Indicator, items: CatalogItemRow[]) => {
      for (const item of items) {
        const q = qty[item.id] || 0;
        if (q > 0) {
          rows.push({
            key: item.id,
            catalogItemId: item.id,
            indicator,
            label: item.label,
            qty: q,
            points: item.points,
            subtotal: q * item.points,
          });
        }
      }
    };

    pushGroup("RENOV_MV", catalog.RENOV_MV);
    pushGroup("RENOV_FB", catalog.RENOV_FB);
    pushGroup("RENOV_AVA_DADOS", catalog.RENOV_AVA_DADOS);
    pushGroup("RENOV_AVA_VOZ", catalog.RENOV_AVA_VOZ);
    for (const cat of catalog.ALTAS) pushGroup("ALTAS", cat.items);

    return rows;
  }, [qty, catalog]);

  const aparelhoNum = parseFloat(aparelhoValor.replace(/\./g, "").replace(",", ".")) || 0;
  const totalPontos = cartItems.reduce((acc, r) => acc + r.subtotal, 0);
  const cnpjDigits = clienteCnpj.replace(/\D/g, "");
  const cnpjOk = cnpjDigits.length === 0 || isValidCnpj(cnpjDigits);

  const canSubmit =
    clienteNome.trim().length > 1 &&
    isValidCnpj(cnpjDigits) &&
    (cartItems.length > 0 || aparelhoNum > 0) &&
    !pending;

  async function handleSubmit() {
    setError(null);
    const items: CartItemInput[] = cartItems.map((r) => ({
      catalogItemId: r.catalogItemId,
      indicator: r.indicator,
      label: r.label,
      quantity: r.qty,
    }));
    if (aparelhoNum > 0) {
      items.push({ indicator: "APARELHOS", label: "Valor vendido em aparelhos", quantity: aparelhoNum });
    }

    setPending(true);
    try {
      await api.post("/api/sales", { clienteNome, clienteCnpj: cnpjDigits, items });
      navigate("/colaborador/vendas");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao registrar venda.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${
                tab === t.id ? "text-white" : "card text-ink-dim"
              }`}
              style={tab === t.id ? { background: "var(--grad)" } : undefined}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        <div className="card p-4">
          {tab === "mv" && (
            <ItemTable
              title="RENOV. MV — Renovação Móvel"
              items={catalog.RENOV_MV}
              qty={qty}
              setQty={setQtyFor}
            />
          )}
          {tab === "fbava" && (
            <div className="flex flex-col gap-5">
              <ItemTable title="RENOV. FB — banda larga fixa" items={catalog.RENOV_FB} qty={qty} setQty={setQtyFor} />
              <ItemTable title="RENOV. AVA — Dados" items={catalog.RENOV_AVA_DADOS} qty={qty} setQty={setQtyFor} />
              <ItemTable title="RENOV. AVA — Voz" items={catalog.RENOV_AVA_VOZ} qty={qty} setQty={setQtyFor} />
            </div>
          )}
          {tab === "altas" && (
            <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto pr-1">
              {catalog.ALTAS.map((cat) => (
                <ItemTable
                  key={cat.categoryId}
                  title={`${cat.categoryIcon ?? ""} ${cat.categoryName}`}
                  items={cat.items}
                  qty={qty}
                  setQty={setQtyFor}
                  withPrice
                />
              ))}
            </div>
          )}
          {tab === "aparelhos" && (
            <div className="flex flex-col gap-3">
              <label className="text-xs uppercase tracking-wide text-ink-dim">
                Valor total vendido em aparelhos (R$)
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="input w-56 font-bold text-accent-2"
                placeholder="0,00"
                value={aparelhoValor}
                onChange={(e) => setAparelhoValor(e.target.value)}
              />
              <p className="text-xs text-ink-dim">
                Este valor entra como um único item de venda em Aparelhos, com o bônus calculado
                automaticamente.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
        <div className="card p-4 flex flex-col gap-3">
          <h2 className="font-bold text-sm">Dados do cliente</h2>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-wide text-ink-dim">Nome do cliente</label>
            <input
              className="input"
              value={clienteNome}
              onChange={(e) => setClienteNome(e.target.value)}
              placeholder="Razão social / nome"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-wide text-ink-dim">CNPJ</label>
            <input
              className="input"
              value={clienteCnpj}
              onChange={(e) => setClienteCnpj(maskCnpj(e.target.value))}
              placeholder="00.000.000/0000-00"
              maxLength={18}
            />
            {!cnpjOk && <span className="text-xs text-accent-3">CNPJ inválido.</span>}
          </div>
        </div>

        <div className="card p-4 flex flex-col gap-3">
          <h2 className="font-bold text-sm">Resumo do carrinho</h2>
          {cartItems.length === 0 && aparelhoNum === 0 && (
            <p className="text-xs text-ink-dim">Nenhum item selecionado ainda.</p>
          )}
          <ul className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {cartItems.map((r) => (
              <li key={r.key} className="flex justify-between text-sm">
                <span>
                  {r.label} <span className="text-ink-dim">x{r.qty}</span>
                </span>
                <span className="font-bold text-accent-2">{fmtNum(r.subtotal)} pts</span>
              </li>
            ))}
            {aparelhoNum > 0 && (
              <li className="flex justify-between text-sm">
                <span>Aparelhos</span>
                <span className="font-bold text-accent-2">{fmtBRL(aparelhoNum)}</span>
              </li>
            )}
          </ul>
          <div className="border-t border-line pt-2 flex justify-between text-sm font-bold">
            <span>Total em pontos</span>
            <span>{fmtNum(totalPontos)} pts</span>
          </div>
          {error && <p className="text-xs text-accent-3">{error}</p>}
          <button disabled={!canSubmit} onClick={handleSubmit} className="btn-grad disabled:opacity-50">
            {pending ? "Registrando..." : "Registrar venda"}
          </button>
          <p className="text-[.7rem] text-ink-dim">
            A venda nasce como <b>pendente</b>. Você atualiza o status e marca como Ativo depois, em
            Minhas vendas.
          </p>
        </div>
      </div>
    </div>
  );
}

function ItemTable({
  title,
  items,
  qty,
  setQty,
  withPrice,
}: {
  title: string;
  items: CatalogItemRow[];
  qty: Record<string, number>;
  setQty: (id: string, v: number) => void;
  withPrice?: boolean;
}) {
  return (
    <div>
      <div className="text-sm font-bold mb-2">{title}</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink-dim text-xs uppercase">
            <th className="py-1">Item</th>
            {withPrice && <th className="py-1">Preço</th>}
            <th className="py-1">Pontos</th>
            <th className="py-1">Qtd.</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-white/5">
              <td className="py-2">{item.label}</td>
              {withPrice && <td className="py-2 text-ink-dim text-xs">{item.price != null ? fmtBRL(item.price) : "—"}</td>}
              <td className="py-2 text-accent-2 font-bold">{item.points}</td>
              <td className="py-2">
                <QtyInput value={qty[item.id] || 0} onChange={(v) => setQty(item.id, v)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
