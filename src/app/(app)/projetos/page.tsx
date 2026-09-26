import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { ProjectsExplorer } from "@/components/project/ProjectsExplorer";
import { ListSkeleton } from "@/components/ui/Bits";
import { requireUser } from "@/lib/auth";
import { listCategories, listClients, listProjects, listTags } from "@/lib/queries";

export const metadata = { title: "Projetos" };
export const dynamic = "force-dynamic";

export default async function ProjetosPage() {
  await requireUser();

  const projects = listProjects({ includeArchived: true });
  const categories = listCategories();
  const clients = listClients(true);
  const tags = listTags();
  const active = projects.filter((p) => !p.is_archived).length;
  const archived = projects.length - active;

  return (
    <div>
      <PageHeader
        title="Projetos"
        eyebrow="Central"
        description={`${active} em operação${archived > 0 ? ` · ${archived} arquivado${archived === 1 ? "" : "s"}` : ""}. Filtre, agrupe e alterne entre cartões, lista e quadro.`}
        actions={
          <Link href="/projetos/novo" className="btn btn-primary">
            <Plus size={15} />
            Novo projeto
          </Link>
        }
      />

      <Suspense fallback={<ListSkeleton rows={6} />}>
        <ProjectsExplorer
          projects={projects}
          categories={categories}
          clients={clients}
          tags={tags}
          now={Date.now()}
        />
      </Suspense>
    </div>
  );
}
