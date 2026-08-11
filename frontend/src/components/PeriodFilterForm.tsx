import { useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

// A régua de premiação é apurada por mês, mas o supervisor pode querer
// recortar datas específicas dentro do mês também — por isso o seletor é um
// calendário de verdade (dia a dia), com o cabeçalho mostrando mês + ano e
// navegação mês a mês. Os atalhos "Mês atual"/"Mês passado" preenchem
// automaticamente do dia 01 até o último dia do mês.

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

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoDate(y: number, m: number, d: number): string {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

function firstDayOfMonthStr(y: number, m: number): string {
  return toIsoDate(y, m, 1);
}

function lastDayOfMonthStr(y: number, m: number): string {
  return toIsoDate(y, m, new Date(y, m + 1, 0).getDate());
}

function parseIso(value: string): { y: number; m: number; d: number } | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m: m - 1, d };
}

function DateCalendarPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string; // "YYYY-MM-DD" ou ""
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const parsed = parseIso(value);
  const hoje = new Date();
  const [viewYear, setViewYear] = useState(parsed?.y ?? hoje.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.m ?? hoje.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function abrir() {
    setViewYear(parsed?.y ?? hoje.getFullYear());
    setViewMonth(parsed?.m ?? hoje.getMonth());
    setOpen((o) => !o);
  }

  function mudarMes(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  const diasNoMes = new Date(viewYear, viewMonth + 1, 0).getDate();
  const primeiroDiaSemana = new Date(viewYear, viewMonth, 1).getDay(); // 0 = domingo
  const celulas: (number | null)[] = [
    ...Array(primeiroDiaSemana).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];

  const displayLabel = parsed ? `${parsed.d} de ${MESES_COMPLETO[parsed.m]} de ${parsed.y}` : "Selecionar data";

  return (
    <div className="flex flex-col gap-1 relative" ref={ref}>
      <label className="text-xs uppercase tracking-wide text-ink-dim">{label}</label>
      <button
        type="button"
        onClick={abrir}
        className="input py-1.5 flex items-center gap-2 text-left whitespace-nowrap"
      >
        <span>📅</span>
        <span className={value ? "" : "text-ink-dim"}>{displayLabel}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 card p-3 w-72 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => mudarMes(-1)}
              className="px-2 py-1 rounded hover:bg-white/10 text-sm font-bold"
            >
              ◀
            </button>
            <span className="font-bold text-sm">
              {MESES_COMPLETO[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={() => mudarMes(1)}
              className="px-2 py-1 rounded hover:bg-white/10 text-sm font-bold"
            >
              ▶
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DIAS_SEMANA.map((d, i) => (
              <div key={i} className="text-center text-[.65rem] font-bold text-ink-dim py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {celulas.map((dia, idx) => {
              if (dia === null) return <div key={idx} />;
              const isSelected = parsed?.y === viewYear && parsed?.m === viewMonth && parsed?.d === dia;
              const isHoje =
                hoje.getFullYear() === viewYear && hoje.getMonth() === viewMonth && hoje.getDate() === dia;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onChange(toIsoDate(viewYear, viewMonth, dia));
                    setOpen(false);
                  }}
                  className="text-xs font-semibold py-1.5 rounded-lg transition"
                  style={
                    isSelected
                      ? { background: "var(--grad)", color: "#fff" }
                      : isHoje
                      ? { background: "rgba(255,255,255,.08)", color: "var(--accent-2)" }
                      : { background: "rgba(255,255,255,.03)", color: "var(--ink)" }
                  }
                >
                  {dia}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-2">
            <button
              type="button"
              onClick={() => {
                onChange(firstDayOfMonthStr(viewYear, viewMonth));
                setOpen(false);
              }}
              className="text-[.7rem] text-accent-2 underline"
            >
              1º dia do mês
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(lastDayOfMonthStr(viewYear, viewMonth));
                setOpen(false);
              }}
              className="text-[.7rem] text-accent-2 underline"
            >
              Último dia do mês
            </button>
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
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  function applyRange(fromValue: string, toValue: string) {
    const next = new URLSearchParams(searchParams);
    if (fromValue) next.set("from", fromValue);
    else next.delete("from");
    if (toValue) next.set("to", toValue);
    else next.delete("to");
    setSearchParams(next);
  }

  function apply() {
    applyRange(from, to);
  }

  function selecionarMesAtual() {
    const hoje = new Date();
    const f = firstDayOfMonthStr(hoje.getFullYear(), hoje.getMonth());
    const t = lastDayOfMonthStr(hoje.getFullYear(), hoje.getMonth());
    setFrom(f);
    setTo(t);
    applyRange(f, t);
  }

  function selecionarMesPassado() {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const f = firstDayOfMonthStr(d.getFullYear(), d.getMonth());
    const t = lastDayOfMonthStr(d.getFullYear(), d.getMonth());
    setFrom(f);
    setTo(t);
    applyRange(f, t);
  }

  function clear() {
    setFrom("");
    setTo("");
    const next = new URLSearchParams(searchParams);
    next.delete("from");
    next.delete("to");
    setSearchParams(next);
  }

  return (
    <div className="card p-3 flex flex-wrap items-end gap-3">
      <DateCalendarPicker label="De" value={from} onChange={setFrom} />
      <DateCalendarPicker label="Até" value={to} onChange={setTo} />
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
