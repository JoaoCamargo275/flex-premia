import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { VendaCart, type CatalogData } from "./VendaCart";

export default function NovaVendaPage() {
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<CatalogData>("/api/catalog")
      .then(setCatalog)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar catálogo."));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Nova venda</h1>
        <p className="text-sm text-ink-dim">
          Escolha os produtos vendidos, informe o cliente e confirme para registrar a venda. Ela
          nasce como <b>pendente</b> e não conta pontos até você marcá-la como Ativo em{" "}
          <b>Minhas vendas</b>.
        </p>
      </div>
      {error && <p className="text-sm text-accent-3">{error}</p>}
      {catalog && <VendaCart catalog={catalog} />}
    </div>
  );
}
