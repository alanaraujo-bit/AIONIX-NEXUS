import { ClientsManager, type ClientWithStats } from "@/components/clients/ClientsManager";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { listClients, listProjects } from "@/lib/queries";

export const metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  await requireUser();
  const projects = await listProjects({ includeArchived: true });
  const clients: ClientWithStats[] = (await listClients(true)).map((c) => {
    const mine = projects.filter((p) => p.client_id === c.id);
    return {
      ...c,
      projectCount: mine.length,
      activeCount: mine.filter((p) => p.status === "active" && !p.is_archived).length,
    };
  });

  return (
    <div>
      <PageHeader
        title="Clientes"
        eyebrow="Relacionamento"
        description="Quem contrata o quê. Cada cliente reúne seus projetos, contatos e observações."
      />
      <ClientsManager clients={clients} />
    </div>
  );
}
