import { useEffect, useMemo, useState } from "react";
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
  observacao?: string;
}

interface AparelhoLinha {
  id: string;
  nome: string;
  valor: string;
  observacao: string;
}

type Tab = "mv" | "fbava" | "altas" | "aparelhos";

// Mesmo mapeamento usado no backend (ver ALTAS_CATEGORY_PREFIX em
// backend/src/routes/sales.ts) — só para o resumo do carrinho já mostrar o
// rótulo igual ao que será de fato salvo.
const ALTAS_CATEGORY_PREFIX: Record<string, string> = {
  movel: "Móvel",
  movelportin: "Portin",
  fixa: "FB",
  dados: "Dados",
  tv: "TV",
  fixo: "Fixo",
  sip: "SIP",
  vvn: "VVN",
  ms365: "MS365",
  gworkspace: "Google WS",
  antivirus: "Antivírus",
  mdm: "MDM",
  valesaude: "Vale Saúde",
  travel: "Travel",
};

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "mv", label: "RENOV. MV", emoji: "📱" },
  { id: "fbava", label: "RENOV. FB/AVA", emoji: "🔄" },
  { id: "altas", label: "ALTAS", emoji: "🚀" },
  { id: "aparelhos", label: "Aparelhos", emoji: "💰" },
];

function QtyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  // Campo de texto (não type="number") controlado por uma string própria:
  // inputs numéricos nativos têm um comportamento de seleção/cursor
  // inconsistente entre navegadores que fazia dígitos serem perdidos ao
  // digitar números com mais de um dígito (ex.: "50" virava "5"). Aqui a
  // gente mesmo filtra os dígitos e só sincroniza com o número do pai.
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, "");
    setText(digits);
    onChange(digits ? Math.max(0, parseInt(digits, 10)) : 0);
  }

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
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={() => setText(String(value))}
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
  const [altasBusca, setAltasBusca] = useState("");
  const [aparelhoNome, setAparelhoNome] = useState("");
  const [aparelhoValorInput, setAparelhoValorInput] = useState("");
  const [aparelhoObs, setAparelhoObs] = useState("");
  const [aparelhos, setAparelhos] = useState<AparelhoLinha[]>([]);
  const [clienteNome, setClienteNome] = useState("");
  const [clienteCnpj, setClienteCnpj] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const setQtyFor = (id: string, v: number) => setQty((prev) => ({ ...prev, [id]: v }));

  const cartItems = useMemo(() => {
    const rows: { key: string; catalogItemId: string; indicator: Indicator; label: string; qty: number; points: number; subtotal: number }[] = [];

    const pushGroup = (indicator: Indicator, items: CatalogItemRow[], labelPrefix?: string) => {
      for (const item of items) {
        const q = qty[item.id] || 0;
        if (q > 0) {
          rows.push({
            key: item.id,
            catalogItemId: item.id,
            indicator,
            label: labelPrefix ? `${labelPrefix} ${item.label}` : item.label,
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
    // O rótulo ganha o prefixo da categoria (ex.: "FB 400MB") para não se
    // perder depois no acompanhamento — mesma regra aplicada no backend
    // quando a venda é de fato salva (ver ALTAS_CATEGORY_PREFIX em sales.ts).
    for (const cat of catalog.ALTAS) pushGroup("ALTAS", cat.items, cat.categoryId ? ALTAS_CATEGORY_PREFIX[cat.categoryId] : undefined);

    return rows;
  }, [qty, catalog]);

  const altasFilteredCount = useMemo(() => {
    const q = altasBusca.trim().toLowerCase();
    if (!q) return catalog.ALTAS.reduce((acc, cat) => acc + cat.items.length, 0);
    return catalog.ALTAS.reduce(
      (acc, cat) =>
        acc + cat.items.filter((item) => item.label.toLowerCase().includes(q) || (cat.categoryName ?? "").toLowerCase().includes(q)).length,
      0
    );
  }, [catalog, altasBusca]);

  const totalPontos = cartItems.reduce((acc, r) => acc + r.subtotal, 0);
  const totalAparelhos = aparelhos.reduce((acc, a) => acc + (parseFloat(a.valor.replace(/\./g, "").replace(",", ".")) || 0), 0);
  const cnpjDigits = clienteCnpj.replace(/\D/g, "");
  const cnpjOk = cnpjDigits.length === 0 || isValidCnpj(cnpjDigits);

  const aparelhoValorNum = parseFloat(aparelhoValorInput.replace(/\./g, "").replace(",", ".")) || 0;
  function addAparelho() {
    if (!aparelhoNome.trim() || aparelhoValorNum <= 0) return;
    setAparelhos((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length}`, nome: aparelhoNome.trim(), valor: aparelhoValorInput, observacao: aparelhoObs.trim() },
    ]);
    setAparelhoNome("");
    setAparelhoValorInput("");
    setAparelhoObs("");
  }
  function removeAparelho(id: string) {
    setAparelhos((prev) => prev.filter((a) => a.id !== id));
  }

  const canSubmit =
    clienteNome.trim().length > 1 &&
    isValidCnpj(cnpjDigits) &&
    (cartItems.length > 0 || aparelhos.length > 0) &&
    !pending;

  async function handleSubmit() {
    setError(null);
    const items: CartItemInput[] = cartItems.map((r) => ({
      catalogItemId: r.catalogItemId,
      indicator: r.indicator,
      label: r.label,
      quantity: r.qty,
    }));
    for (const a of aparelhos) {
      const valor = parseFloat(a.valor.replace(/\./g, "").replace(",", ".")) || 0;
      if (valor > 0) {
        items.push({ indicator: "APARELHOS", label: a.nome, quantity: valor, observacao: a.observacao || undefined });
      }
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
            <div className="flex flex-col gap-4">
              <input
                type="text"
                className="input"
                placeholder="🔎 Buscar produto ou categoria..."
                value={altasBusca}
                onChange={(e) => setAltasBusca(e.target.value)}
              />
              <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto pr-1">
                {catalog.ALTAS.map((cat) => {
                  const q = altasBusca.trim().toLowerCase();
                  const items = q
                    ? cat.items.filter(
                        (item) => item.label.toLowerCase().includes(q) || (cat.categoryName ?? "").toLowerCase().includes(q)
                      )
                    : cat.items;
                  if (q && items.length === 0) return null;
                  return (
                    <ItemTable
                      key={cat.categoryId}
                      title={`${cat.categoryIcon ?? ""} ${cat.categoryName}`}
                      items={items}
                      qty={qty}
                      setQty={setQtyFor}
                      withPrice
                    />
                  );
                })}
                {altasBusca.trim() && altasFilteredCount === 0 && (
                  <p className="text-sm text-ink-dim">Nenhum produto encontrado para "{altasBusca}".</p>
                )}
              </div>
            </div>
          )}
          {tab === "aparelhos" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
                <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                  <label className="text-xs uppercase tracking-wide text-ink-dim">Aparelho vendido</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex.: iPhone 15, Galaxy A55..."
                    value={aparelhoNome}
                    onChange={(e) => setAparelhoNome(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1 w-40">
                  <label className="text-xs uppercase tracking-wide text-ink-dim">Valor (R$)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="input font-bold text-accent-2"
                    placeholder="0,00"
                    value={aparelhoValorInput}
                    onChange={(e) => setAparelhoValorInput(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                  <label className="text-xs uppercase tracking-wide text-ink-dim">Observação (opcional)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex.: cor, condição, parcelamento..."
                    value={aparelhoObs}
                    onChange={(e) => setAparelhoObs(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={addAparelho}
                  disabled={!aparelhoNome.trim() || aparelhoValorNum <= 0}
                  className="btn-grad disabled:opacity-50 h-[42px]"
                >
                  + Adicionar
                </button>
              </div>

              {aparelhos.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {aparelhos.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 text-sm border-t border-white/5 pt-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{a.nome}</div>
                        {a.observacao && <div className="text-xs text-ink-dim truncate">{a.observacao}</div>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-accent-2">
                          {fmtBRL(parseFloat(a.valor.replace(/\./g, "").replace(",", ".")) || 0)}
                        </span>
                        <button type="button" onClick={() => removeAparelho(a.id)} className="text-accent-3 text-xs font-bold">
                          Remover
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-xs text-ink-dim">
                Cada aparelho vendido entra como um item separado; o valor total soma para o bônus,
                calculado automaticamente.
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
          {cartItems.length === 0 && aparelhos.length === 0 && (
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
            {aparelhos.map((a) => (
              <li key={a.id} className="flex justify-between text-sm">
                <span>{a.nome}</span>
                <span className="font-bold text-accent-2">
                  {fmtBRL(parseFloat(a.valor.replace(/\./g, "").replace(",", ".")) || 0)}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-line pt-2 flex flex-col gap-1">
            <div className="flex justify-between text-sm font-bold">
              <span>Total em pontos</span>
              <span>{fmtNum(totalPontos)} pts</span>
            </div>
            {totalAparelhos > 0 && (
              <div className="flex justify-between text-sm font-bold text-accent-2">
                <span>Total em aparelhos</span>
                <span>{fmtBRL(totalAparelhos)}</span>
              </div>
            )}
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
