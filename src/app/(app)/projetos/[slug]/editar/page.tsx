import { notFound } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { ProjectForm } from "@/components/project/ProjectForm";
import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { getProject, listCategories, listClients, listTags } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);
  return { title: project ? `Editar ${project.name}` : "Editar projeto" };
}

export default async function EditarProjetoPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireUser();
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const tech = (await all<{ name: string }>(
    "SELECT name, COUNT(*) AS n FROM project_tech GROUP BY name ORDER BY n DESC LIMIT 24",
  )).map((r) => r.name);
  const [categories, clients, tags] = await Promise.all([listCategories(), listClients(true), listTags()]);

  return (
    <div>
      <PageHeader
        title={`Editar ${project.name}`}
        crumbs={[
          { label: "Projetos", href: "/projetos" },
          { label: project.name, href: `/projetos/${project.slug}` },
          { label: "Editar" },
        ]}
      />
      <ProjectForm
        project={project}
        categories={categories}
        clients={clients}
        tagSuggestions={tags.map((t) => t.name)}
        techSuggestions={tech}
      />
    </div>
  );
}
