/** Tipos do índice de busca — compartilhados entre servidor e cliente. */

export type SearchKind = "project" | "client" | "tool" | "link" | "page" | "category" | "tag" | "note";

export interface SearchEntry {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  /** Texto extra que participa da busca mas não aparece. */
  keywords: string;
  href?: string;
  url?: string;
  icon: string;
  accent: string;
  badge?: string;
  /** Peso base — projetos fixados e favoritos sobem. */
  boost: number;
}

export const KIND_LABEL: Record<SearchKind, string> = {
  project: "Projetos",
  link: "Links de projeto",
  tool: "Ferramentas",
  client: "Clientes",
  page: "Navegar",
  category: "Categorias",
  tag: "Tags",
  note: "Notas",
};

export const KIND_ORDER: Record<SearchKind, number> = {
  project: 0,
  link: 1,
  tool: 2,
  client: 3,
  page: 4,
  category: 5,
  tag: 6,
  note: 7,
};
