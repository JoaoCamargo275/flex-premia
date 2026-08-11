// Formatação de números no padrão brasileiro (milhar com ponto, decimal com
// vírgula), feita manualmente em vez de depender de n.toLocaleString("pt-BR").
// Alguns navegadores/ambientes não trazem os dados de localidade completos do
// pt-BR e silenciosamente caem para uma formatação padrão (vírgula no milhar)
// mesmo quando "pt-BR" é pedido — por isso aqui a formatação é feita na mão,
// garantindo o mesmo resultado em qualquer navegador.

function agruparMilhar(digitos: string): string {
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const negativo = n < 0;
  const abs = Math.abs(n);
  if (Number.isInteger(abs)) {
    return (negativo ? "-" : "") + agruparMilhar(String(abs));
  }
  const [parteInteira, parteDecimal] = abs.toFixed(2).split(".");
  return (negativo ? "-" : "") + agruparMilhar(parteInteira) + "," + parteDecimal;
}

export function fmtBRL(n: number): string {
  if (!Number.isFinite(n)) n = 0;
  const negativo = n < 0;
  const abs = Math.abs(n);
  const [parteInteira, parteDecimal] = abs.toFixed(2).split(".");
  return (negativo ? "-R$ " : "R$ ") + agruparMilhar(parteInteira) + "," + parteDecimal;
}
