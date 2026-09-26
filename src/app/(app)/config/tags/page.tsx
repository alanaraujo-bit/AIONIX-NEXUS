import { CatalogManager, type CatalogItem } from "@/components/config/CatalogManager";
import { deleteTagAction, saveTagAction } from "@/lib/actions/catalog";
import { requireUser } from "@/lib/auth";
import { listTags, tagUsage } from "@/lib/queries";

export const metadata = { title: "Tags" };
export const dynamic = "force-dynamic";

export default async function TagsPage() {
  await requireUser();
  const usage = tagUsage();
  const items: CatalogItem[] = listTags().map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    color: t.color,
    count: usage[t.id] ?? 0,
  }));

  return (
    <CatalogManager
      items={items}
      table="tags"
      singular="Tag"
      plural="Tags"
      withIcon={false}
      reorderable={false}
      hrefFor={(i) => `/projetos?tag=${i.slug}`}
      saveAction={saveTagAction}
      deleteAction={deleteTagAction}
      emptyHint="Tags cruzam categorias — “receita”, “infra”, “IA”, “legado”. Você também cria tags direto no editor de projeto."
    />
  );
}
