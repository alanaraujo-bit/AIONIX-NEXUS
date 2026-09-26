import { NotesBoard } from "@/components/notes/NotesBoard";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { listAllNotes, listProjects } from "@/lib/queries";

export const metadata = { title: "Notas" };
export const dynamic = "force-dynamic";

export default async function NotasPage() {
  await requireUser();
  const notes = listAllNotes();
  const projects = listProjects({ includeArchived: true }).map((p) => ({ id: p.id, name: p.name }));

  return (
    <div>
      <PageHeader
        title="Notas"
        eyebrow="Memória"
        description="Tudo que você anotou, dentro e fora de projetos. As fixadas sobem para o topo."
      />
      <NotesBoard notes={notes} projects={projects} />
    </div>
  );
}
