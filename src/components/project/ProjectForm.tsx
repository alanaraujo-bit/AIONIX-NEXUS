"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Save } from "lucide-react";

import { EntityAvatar } from "@/components/Badges";
import { ColorPicker, IconPicker, TokenInput } from "@/components/ui/Pickers";
import { FormError, FormPending, SubmitButton } from "@/components/ui/Bits";
import { useToast } from "@/components/ui/Toast";
import {
  PRIORITIES,
  PRIORITY_META,
  STAGES,
  STAGE_META,
  STATUSES,
  STATUS_META,
  asAccent,
  type Accent,
} from "@/lib/domain";
import { saveProjectAction, type ActionState } from "@/lib/actions/projects";
import type { Category, Client, Project } from "@/lib/types";
import { slugify, toDateInput } from "@/lib/utils";

interface Props {
  project?: Project;
  categories: Category[];
  clients: Client[];
  tagSuggestions: string[];
  techSuggestions: string[];
}

export function ProjectForm({ project, categories, clients, tagSuggestions, techSuggestions }: Props) {
  const [state, action] = useActionState<ActionState, FormData>(saveProjectAction, {});
  const { toast } = useToast();

  const [name, setName] = useState(project?.name ?? "");
  const [slug, setSlug] = useState(project?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(project));
  const [icon, setIcon] = useState(project?.icon ?? "Box");
  const [color, setColor] = useState<Accent>(asAccent(project?.color, "indigo"));
  const [progress, setProgress] = useState(project?.progress ?? 0);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  useEffect(() => {
    if (state.ok) toast({ title: state.ok, tone: "success" });
    if (state.error) toast({ title: state.error, tone: "error" });
  }, [state, toast]);

  return (
    <form action={action} className="relative space-y-5 pb-24 xl:pb-0">
      <FormPending />
      {project ? <input type="hidden" name="id" value={project.id} /> : null}

      <div className="grid gap-5 xl:grid-cols-12">
        {/* ------------------------------------------------------ esquerda */}
        <div className="space-y-5 xl:col-span-8">
          <Section title="Identidade">
            <div className="flex items-start gap-4">
              <EntityAvatar icon={icon} accent={color} size="lg" className="mt-1" />
              <div className="min-w-0 flex-1 space-y-3.5">
                <div className="field">
                  <label className="label" htmlFor="name">
                    Nome do projeto <Req />
                  </label>
                  <input
                    id="name"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input input-lg"
                    placeholder="Ex.: AIONIX Retail"
                    required
                    maxLength={80}
                    data-autofocus
                  />
                </div>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div className="field">
                    <label className="label" htmlFor="slug">
                      Identificador na URL
                    </label>
                    <input
                      id="slug"
                      name="slug"
                      value={slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setSlug(slugify(e.target.value));
                      }}
                      className="input mono text-xs"
                      placeholder="aionix-retail"
                    />
                    <p className="hint">/projetos/{slug || "…"}</p>
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="codename">
                      Codinome interno
                    </label>
                    <input id="codename" name="codename" defaultValue={project?.codename ?? ""} className="input" placeholder="Opcional" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-[auto_1fr]">
              <div className="field">
                <span className="label">Ícone</span>
                <IconPicker name="icon" value={icon} onChange={setIcon} accent={color} />
              </div>
              <div className="field">
                <span className="label">Cor de identidade</span>
                <ColorPicker name="color" value={color} onChange={setColor} />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="summary">
                Resumo
              </label>
              <input
                id="summary"
                name="summary"
                defaultValue={project?.summary ?? ""}
                className="input"
                placeholder="Uma frase que explica o que é. Aparece nos cartões."
                maxLength={160}
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="description">
                Descrição
              </label>
              <textarea
                id="description"
                name="description"
                defaultValue={project?.description ?? ""}
                className="textarea"
                rows={4}
                placeholder="O problema que resolve, para quem, e o estado atual."
              />
            </div>
          </Section>

          <Section title="Classificação">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="field">
                <label className="label" htmlFor="category_id">
                  Categoria
                </label>
                <select id="category_id" name="category_id" defaultValue={project?.category_id ?? ""} className="select">
                  <option value="">Sem categoria</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="client_id">
                  Cliente
                </label>
                <select id="client_id" name="client_id" defaultValue={project?.client_id ?? ""} className="select">
                  <option value="">Produto próprio / sem cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <span className="label">Tags</span>
              <TokenInput
                name="tags"
                defaultValue={project?.tags.map((t) => t.name).join(", ") ?? ""}
                placeholder="Enter para adicionar"
                suggestions={tagSuggestions}
                prefix="#"
              />
            </div>

            <div className="field">
              <span className="label">Tecnologias</span>
              <TokenInput
                name="tech"
                defaultValue={project?.tech.join(", ") ?? ""}
                placeholder="Next.js, Postgres, Railway…"
                suggestions={techSuggestions}
              />
            </div>
          </Section>

          <Section title="Notas" hint="Markdown simples — fica na aba de notas do projeto.">
            <textarea
              name="notes"
              defaultValue={project?.notes ?? ""}
              className="textarea"
              rows={6}
              placeholder="Decisões, pendências, contexto que você não quer esquecer."
            />
          </Section>
        </div>

        {/* -------------------------------------------------------- direita */}
        <div className="space-y-5 xl:col-span-4">
          <Section title="Estado">
            <div className="field">
              <label className="label" htmlFor="status">
                Status
              </label>
              <select id="status" name="status" defaultValue={project?.status ?? "development"} className="select">
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
              <p className="hint">{STATUS_META[project?.status ?? "development"].hint}</p>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-1">
              <div className="field">
                <label className="label" htmlFor="stage">
                  Estágio
                </label>
                <select id="stage" name="stage" defaultValue={project?.stage ?? "build"} className="select">
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_META[s].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="label" htmlFor="priority">
                  Prioridade
                </label>
                <select id="priority" name="priority" defaultValue={project?.priority ?? "medium"} className="select">
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_META[p].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="progress">
                Progresso · <span className="num font-semibold text-[var(--text)]">{progress}%</span>
              </label>
              <input
                id="progress"
                name="progress"
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--surface-3)] accent-[var(--accent)]"
              />
            </div>
          </Section>

          <Section title="Responsável e datas">
            <div className="field">
              <label className="label" htmlFor="owner">
                Responsável
              </label>
              <input id="owner" name="owner" defaultValue={project?.owner ?? ""} className="input" placeholder="Quem toca" />
            </div>
            <div className="field">
              <label className="label" htmlFor="domain">
                Domínio
              </label>
              <input id="domain" name="domain" defaultValue={project?.domain ?? ""} className="input" placeholder="retail.aionix.com" />
            </div>
            <div className="grid gap-3.5 sm:grid-cols-3 xl:grid-cols-1">
              <DateField id="started_at" label="Início" value={project?.started_at} />
              <DateField id="target_at" label="Meta de entrega" value={project?.target_at} />
              <DateField id="launched_at" label="Lançamento" value={project?.launched_at} />
            </div>
          </Section>

          <FormError message={state.error} />

          <div className="hidden xl:block">
            <Actions project={project} />
          </div>
        </div>
      </div>

      {/* barra fixa de ações no mobile/tablet */}
      <div className="safe-b fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] z-30 border-t border-[var(--line)] bg-[var(--surface-glass)] px-4 py-3 backdrop-blur-xl lg:bottom-0 xl:hidden">
        <Actions project={project} />
      </div>
    </form>
  );
}

function Actions({ project }: { project?: Project }) {
  return (
    <div className="flex items-center gap-2">
      <SubmitButton className="btn btn-primary flex-1 xl:flex-none xl:w-full" pendingLabel="Salvando…" icon={<Save size={15} />}>
        {project ? "Salvar alterações" : "Criar projeto"}
      </SubmitButton>
      <Link href={project ? `/projetos/${project.slug}` : "/projetos"} className="btn btn-ghost">
        Cancelar
      </Link>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="panel space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="h-section">{title}</h2>
        {hint ? <p className="mt-1 text-[0.6875rem] text-[var(--text-4)]">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function DateField({ id, label, value }: { id: string; label: string; value?: string | null }) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input id={id} name={id} type="date" defaultValue={toDateInput(value)} className="input" />
    </div>
  );
}

function Req() {
  return <span className="text-[var(--bad)]">*</span>;
}
