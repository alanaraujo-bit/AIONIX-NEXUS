import type { Accent, LinkKind, Priority, Stage, Status } from "./domain";

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  descricao: string | null;
  icon: string;
  color: Accent;
  sort: number;
}

export interface Client {
  id: string;
  name: string;
  slug: string;
  company: string | null;
  contact: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  color: Accent;
  icon: string;
  archived: boolean;
  sort: number;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color: Accent;
}

export interface ProjectLink {
  id: string;
  project_id: string;
  kind: LinkKind;
  label: string;
  url: string;
  note: string | null;
  sort: number;
  is_primary: boolean;
  monitor: boolean;
  last_status: number | null;
  last_checked_at: string | null;
  last_error: string | null;
}

export interface ProjectStep {
  id: string;
  project_id: string;
  title: string;
  done: boolean;
  due_at: string | null;
  sort: number;
  done_at: string | null;
  created_at: string;
}

export interface ProjectCredential {
  id: string;
  project_id: string;
  label: string;
  vault: string | null;
  identifier: string | null;
  url: string | null;
  note: string | null;
  rotated_at: string | null;
  sort: number;
}

export interface ProjectAsset {
  id: string;
  project_id: string;
  label: string;
  location: string;
  kind: string;
  note: string | null;
  sort: number;
}

export interface Note {
  id: string;
  project_id: string | null;
  title: string | null;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface ToolGroup {
  id: string;
  name: string;
  icon: string;
  sort: number;
}

export interface Tool {
  id: string;
  group_id: string | null;
  name: string;
  url: string;
  subtitle: string | null;
  icon: string;
  color: Accent;
  favorite: boolean;
  sort: number;
  opens: number;
}

export interface ActivityEntry {
  id: string;
  project_id: string | null;
  entity: string;
  entity_id: string | null;
  action: string;
  title: string;
  detail: string | null;
  created_at: string;
}

/** Projeto com os campos derivados que a lista precisa (sem carregar tudo). */
export interface Project {
  id: string;
  name: string;
  slug: string;
  codename: string | null;
  summary: string | null;
  description: string | null;
  icon: string;
  color: Accent;
  category_id: string | null;
  client_id: string | null;
  status: Status;
  stage: Stage;
  priority: Priority;
  progress: number;
  owner: string | null;
  domain: string | null;
  started_at: string | null;
  target_at: string | null;
  launched_at: string | null;
  notes: string | null;
  is_favorite: boolean;
  is_pinned: boolean;
  is_archived: boolean;
  sort: number;
  last_activity_at: string;
  last_opened_at: string | null;
  created_at: string;
  updated_at: string;

  category: Pick<Category, "id" | "name" | "slug" | "icon" | "color"> | null;
  client: Pick<Client, "id" | "name" | "slug" | "color" | "icon"> | null;
  tags: Tag[];
  tech: string[];
  linkCount: number;
  openSteps: number;
  nextStep: { id: string; title: string; due_at: string | null } | null;
  brokenLinks: number;
  primaryUrl: string | null;
}

export interface ProjectDetail extends Project {
  links: ProjectLink[];
  steps: ProjectStep[];
  credentials: ProjectCredential[];
  assets: ProjectAsset[];
  projectNotes: Note[];
  activity: ActivityEntry[];
}

export type AttentionReason =
  | "no-next-step"
  | "stale"
  | "overdue"
  | "broken-link"
  | "no-production-url"
  | "stalled-progress";

export interface AttentionFlag {
  reason: AttentionReason;
  label: string;
  detail: string;
  severity: 1 | 2 | 3;
}

export interface AttentionItem {
  project: Project;
  flags: AttentionFlag[];
  score: number;
}
