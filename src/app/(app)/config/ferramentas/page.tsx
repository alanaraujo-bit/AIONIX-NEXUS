import { QuickAccess } from "@/components/tools/QuickAccess";
import { requireUser } from "@/lib/auth";
import { listToolGroups, listTools } from "@/lib/queries";

export const metadata = { title: "Ferramentas" };
export const dynamic = "force-dynamic";

export default async function ConfigFerramentasPage() {
  await requireUser();
  const [groups, tools] = await Promise.all([listToolGroups(), listTools()]);
  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--text-4)]">
        Os mesmos atalhos que aparecem em <strong className="font-medium text-[var(--text-3)]">Acesso rápido</strong>.
      </p>
      <QuickAccess groups={groups} tools={tools} />
    </div>
  );
}
