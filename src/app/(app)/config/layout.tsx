import { PageHeader } from "@/components/PageHeader";
import { ConfigTabs } from "@/components/config/ConfigTabs";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ConfigLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div>
      <PageHeader
        title="Configurações"
        eyebrow="Administração"
        description="Tudo que o NEXUS usa para organizar seu ecossistema — sem tocar em código."
      />
      <ConfigTabs />
      <div className="mt-6">{children}</div>
    </div>
  );
}
