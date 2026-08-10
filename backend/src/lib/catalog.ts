import { prisma } from "./prisma";

export interface CatalogGroup {
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  items: { id: string; label: string; points: number; price: number | null }[];
}

export interface CatalogData {
  RENOV_MV: CatalogGroup["items"];
  RENOV_FB: CatalogGroup["items"];
  RENOV_AVA_DADOS: CatalogGroup["items"];
  RENOV_AVA_VOZ: CatalogGroup["items"];
  ALTAS: CatalogGroup[];
}

export async function getCatalogData(): Promise<CatalogData> {
  const items = await prisma.catalogItem.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });

  const data: CatalogData = {
    RENOV_MV: [],
    RENOV_FB: [],
    RENOV_AVA_DADOS: [],
    RENOV_AVA_VOZ: [],
    ALTAS: [],
  };

  const altasByCategory = new Map<string, CatalogGroup>();

  for (const item of items) {
    const row = { id: item.id, label: item.label, points: item.points, price: item.price };
    if (item.indicator === "RENOV_MV") data.RENOV_MV.push(row);
    else if (item.indicator === "RENOV_FB") data.RENOV_FB.push(row);
    else if (item.indicator === "RENOV_AVA_DADOS") data.RENOV_AVA_DADOS.push(row);
    else if (item.indicator === "RENOV_AVA_VOZ") data.RENOV_AVA_VOZ.push(row);
    else if (item.indicator === "ALTAS" && item.categoryId) {
      let group = altasByCategory.get(item.categoryId);
      if (!group) {
        group = {
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          categoryIcon: item.categoryIcon,
          items: [],
        };
        altasByCategory.set(item.categoryId, group);
      }
      group.items.push(row);
    }
  }

  data.ALTAS = Array.from(altasByCategory.values());
  return data;
}
