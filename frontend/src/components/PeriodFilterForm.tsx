import { useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

// A régua de premiação é apurada por mês, então o filtro trabalha em
// granularidade de mês. Em vez do seletor nativo do navegador (que em
// alguns sistemas aparece só como um campo de texto segmentado, sem
// calendário visual), montamos um calendariozinho próprio: clica no campo,
// abre um popover com navegação de ano e uma grade com os 12 meses.
// Por baixo, ainda mandamos pro backend o primeiro e o último dia do mês
// escolhido (from/to como data completa).

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_COMPLETO = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function monthFromDateStr(dateStr: string | null): string {
  if (!dateStr) return "";
  return dateStr.slice(0, 7);
}

function firstDayOfMonth(monthStr: string): string {
  return `${monthStr}-01`;
}

function lastDayOfMonth(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${monthStr}-${String(last).padStart(2, "0")}`;
}

function monthStrFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function MonthPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string; // "YYYY-MM" ou ""
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [anoVisivel, setAnoVisivel] = useState(() => {
    if (value) return Number(value.split("-")[0]);
    return new Date().getFullYear();
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const [anoSel, mesSel] = value ? value.split("-").map(Number) : [null, null];

  const displayLabel = value
    ? `${MESES_COMPLETO[Number(value.split("-")[1]) - 1]} de ${value.split("-")[0]}`
    : "Selecionar mês";

  return (
    <div className="flex flex-col gap-1 relative" ref={ref}>
      <label className="text-xs uppercase tracking-wide text-ink-dim">{label}</label>
      <button
        type="button"
        onClick={() => {
          setAnoVisivel(anoSel ?? new Date().getFullYear());
          setOpen((o) => !o);
        }}
        className="input py-1.5 flex items-center gap-2 text-left whitespace-nowrap"
      >
        <span>📅</span>
        <span className={value ? "" : "text-ink-dim"}>{displayLabel}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 card p-3 w-64 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setAnoVisivel((a) => a - 1)}
              className="px-2 py-1 rounded hover:bg-white/10 text-sm font-bold"
            >
              ◀
            </button>
            <span className="font-bold text-sm">{anoVisivel}</span>
            <button
              type="button"
              onClick={() => setAnoVisivel((a) => a + 1)}
              className="px-2 py-1 rounded hover:bg-white/10 text-sm font-bold"
            >
              ▶
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MESES_ABREV.map((label, idx) => {
              const mesNum = idx + 1;
              const isSelected = anoSel === anoVisivel && mesSel === mesNum;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    onChange(`${anoVisivel}-${String(mesNum).padStart(2, "0")}`);
                    setOpen(false);
                  }}
                  className="text-xs font-semibold py-2 rounded-lg transition"
                  style={
                    isSelected
                      ? { background: "var(--grad)", color: "#fff" }
                      : { background: "rgba(255,255,255,.04)", color: "var(--ink)" }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="mt-2 text-xs text-ink-dim underline"
            >
              Limpar seleção
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function PeriodFilterForm() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [fromMonth, setFromMonth] = useState(monthFromDateStr(searchParams.get("from")));
  const [toMonth, setToMonth] = useState(monthFromDateStr(searchParams.get("to")));

  function applyRange(from: string, to: string) {
    const next = new URLSearchParams(searchParams);
    if (from) next.set("from", firstDayOfMonth(from));
    else next.delete("from");
    if (to) next.set("to", lastDayOfMonth(to));
    else next.delete("to");
    setSearchParams(next);
  }

  function apply() {
    applyRange(fromMonth, toMonth);
  }

  function selecionarMesAtual() {
    const m = monthStrFromDate(new Date());
    setFromMonth(m);
    setToMonth(m);
    applyRange(m, m);
  }

  function selecionarMesPassado() {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const m = monthStrFromDate(d);
    setFromMonth(m);
    setToMonth(m);
    applyRange(m, m);
  }

  function clear() {
    setFromMonth("");
    setToMonth("");
    const next = new URLSearchParams(searchParams);
    next.delete("from");
    next.delete("to");
    setSearchParams(next);
  }

  return (
    <div className="card p-3 flex flex-wrap items-end gap-3">
      <MonthPicker label="De (mês)" value={fromMonth} onChange={setFromMonth} />
      <MonthPicker label="Até (mês)" value={toMonth} onChange={setToMonth} />
      <button onClick={apply} className="btn-grad py-1.5 text-sm">
        Filtrar
      </button>
      <button onClick={selecionarMesAtual} className="text-sm text-accent-2 underline">
        Mês atual
      </button>
      <button onClick={selecionarMesPassado} className="text-sm text-accent-2 underline">
        Mês passado
      </button>
      <button onClick={clear} className="text-sm text-ink-dim underline">
        Limpar
      </button>
    </div>
  );
}
