import { CatalogManager, type CatalogItem } from "@/components/config/CatalogManager";
import { deleteCategoryAction, saveCategoryAction } from "@/lib/actions/catalog";
import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { listCategories } from "@/lib/queries";

export const metadata = { title: "Categorias" };
export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  await requireUser();
  const counts = Object.fromEntries(
    all<{ category_id: string; n: number }>(
      "SELECT category_id, COUNT(*) AS n FROM projects WHERE category_id IS NOT NULL GROUP BY category_id",
    ).map((r) => [r.category_id, r.n]),
  );

  const items: CatalogItem[] = listCategories().map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    color: c.color,
    icon: c.icon,
    descricao: c.descricao,
    count: counts[c.id] ?? 0,
  }));

  return (
    <CatalogManager
      items={items}
      table="categories"
      singular="Categoria"
      plural="Categorias"
      withIcon
      withDescription
      hrefFor={(i) => `/projetos?categoria=${i.slug}`}
      saveAction={saveCategoryAction}
      deleteAction={deleteCategoryAction}
      emptyHint="Categorias separam produtos próprios, SaaS, sistemas internos, clientes e experimentos."
    />
  );
}
