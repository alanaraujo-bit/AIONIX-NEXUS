"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { get, run, tx, uid } from "@/lib/db";
import { logActivity } from "@/lib/queries";
import { clearDemo, seedDemo, type SeedDb } from "@/lib/seed-run";

const adapter: SeedDb = { get, run, uid };

/** Popula o NEXUS com um portfólio de demonstração. Idempotente por slug. */
export async function seedDemoAction() {
  await requireUser();
  const { created } = await tx(async () => seedDemo(adapter));
  await logActivity({
    entity: "system",
    action: "create",
    title: `Portfólio de demonstração carregado`,
    detail: `${created} projeto(s) adicionados`,
  });
  revalidatePath("/", "layout");
}

/** Remove exatamente o que o seed criou, preservando o que você cadastrou. */
export async function clearDemoAction() {
  await requireUser();
  const removed = await tx(async () => clearDemo(adapter));
  await logActivity({
    entity: "system",
    action: "delete",
    title: "Dados de demonstração removidos",
    detail: `${removed} projeto(s) apagados`,
  });
  revalidatePath("/", "layout");
}
