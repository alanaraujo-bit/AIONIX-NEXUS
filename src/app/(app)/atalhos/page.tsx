import { PageHeader } from "@/components/PageHeader";
import { QuickAccess } from "@/components/tools/QuickAccess";
import { requireUser } from "@/lib/auth";
import { listToolGroups, listTools } from "@/lib/queries";

export const metadata = { title: "Acesso rápido" };
export const dynamic = "force-dynamic";

export default async function AtalhosPage() {
  await requireUser();
  const groups = listToolGroups();
  const tools = listTools();

  return (
    <div>
      <PageHeader
        title="Acesso rápido"
        eyebrow="Ferramentas"
        description="Os painéis e serviços que você abre todo dia, organizados em grupos. Tudo aqui também responde no ⌘K."
      />
      <QuickAccess groups={groups} tools={tools} />
    </div>
  );
}
