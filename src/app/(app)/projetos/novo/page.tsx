import { PageHeader } from "@/components/PageHeader";
import { ProjectForm } from "@/components/project/ProjectForm";
import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { listCategories, listClients, listTags } from "@/lib/queries";

export const metadata = { title: "Novo projeto" };
export const dynamic = "force-dynamic";

export default async function NovoProjetoPage() {
  await requireUser();
  const tech = (await all<{ name: string }>(
    "SELECT name, COUNT(*) AS n FROM project_tech GROUP BY name ORDER BY n DESC LIMIT 24",
  )).map((r) => r.name);
  const [categories, clients, tags] = await Promise.all([listCategories(), listClients(), listTags()]);

  return (
    <div>
      <PageHeader
        title="Novo projeto"
        crumbs={[{ label: "Projetos", href: "/projetos" }, { label: "Novo" }]}
        description="Só o nome é obrigatório. Links, ambientes e próximos passos você adiciona depois, na página do projeto."
      />
      <ProjectForm
        categories={categories}
        clients={clients}
        tagSuggestions={tags.map((t) => t.name)}
        techSuggestions={tech}
      />
    </div>
  );
}
