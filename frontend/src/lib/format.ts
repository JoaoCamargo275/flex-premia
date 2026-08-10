export function fmtBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtNum(n: number): string {
  return n.toLocaleString("pt-BR");
}
