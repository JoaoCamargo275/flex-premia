// Gera uma senha temporária legível (sem caracteres ambíguos tipo 0/O, 1/l),
// usada quando um Supervisor/Master reseta a senha de alguém manualmente —
// a pessoa loga com ela e é obrigada a trocar (mustChangePassword).
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function gerarSenhaTemporaria(tamanho = 10): string {
  let senha = "";
  for (let i = 0; i < tamanho; i++) {
    senha += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return senha;
}
