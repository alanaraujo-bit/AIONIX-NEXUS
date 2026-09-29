"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  changePassword,
  createUser,
  currentUser,
  endAllSessions,
  endSession,
  findUserByEmail,
  loginLocked,
  recordAttempt,
  startSession,
  userCount,
  verifyPassword,
} from "@/lib/auth";
import { run, setSetting } from "@/lib/db";

export interface AuthState {
  error?: string;
  ok?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Só aceita caminhos internos — nunca redireciona para fora do NEXUS. */
function safeNext(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/login")) return "/";
  return raw;
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Informe e-mail e senha." };

  const locked = await loginLocked(email);
  if (locked) return { error: `Muitas tentativas. Aguarde ${locked} minutos antes de tentar de novo.` };

  const user = await findUserByEmail(email);
  // Verifica sempre, mesmo sem usuário, para não vazar existência por tempo.
  const hash = user?.password_hash ?? "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const valid = await verifyPassword(password, hash);

  if (!user || !valid) {
    await recordAttempt(email, false);
    return { error: "E-mail ou senha incorretos." };
  }

  await recordAttempt(email, true);
  await startSession(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function setupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if ((await userCount()) > 0) return { error: "O NEXUS já foi configurado." };

  const name = String(formData.get("name") ?? "").trim() || "Operador";
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!EMAIL_RE.test(email)) return { error: "Informe um e-mail válido." };
  if (password.length < 10) return { error: "A senha precisa ter ao menos 10 caracteres." };
  if (password !== confirm) return { error: "As senhas não conferem." };

  const id = await createUser(email, password, name);
  await setSetting("owner_name", name);
  await startSession(id);
  redirect("/");
}

export async function logoutAction() {
  await endSession();
  redirect("/login");
}

export async function changePasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const user = await currentUser();
  if (!user) return { error: "Sessão expirada." };

  const atual = String(formData.get("current") ?? "");
  const nova = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const row = await findUserByEmail(user.email);
  if (!row || !(await verifyPassword(atual, row.password_hash))) return { error: "Senha atual incorreta." };
  if (nova.length < 10) return { error: "A nova senha precisa ter ao menos 10 caracteres." };
  if (nova !== confirm) return { error: "As senhas não conferem." };

  await changePassword(user.id, nova);
  return { ok: "Senha alterada. As outras sessões continuam válidas — encerre-as se quiser." };
}

export async function updateAccountAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const user = await currentUser();
  if (!user) return { error: "Sessão expirada." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!name) return { error: "Informe um nome." };
  if (!EMAIL_RE.test(email)) return { error: "Informe um e-mail válido." };

  const other = await findUserByEmail(email);
  if (other && other.id !== user.id) return { error: "Esse e-mail já está em uso." };

  await run("UPDATE users SET name = ?, email = ?, updated_at = datetime('now') WHERE id = ?", [name, email, user.id]);
  await setSetting("owner_name", name);
  revalidatePath("/", "layout");
  return { ok: "Conta atualizada." };
}

export async function revokeSessionAction(formData: FormData) {
  const user = await currentUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  await run("DELETE FROM sessions WHERE id = ? AND user_id = ?", [id, user.id]);
  revalidatePath("/config/conta");
}

export async function revokeAllSessionsAction() {
  const user = await currentUser();
  if (!user) return;
  await endAllSessions(user.id);
  redirect("/login");
}
