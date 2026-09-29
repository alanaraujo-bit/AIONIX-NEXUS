import "server-only";

import { createHmac, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { all, get, ready, run, setSetting, setting } from "./db";
import type { User } from "./types";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

export const SESSION_COOKIE = "nexus_session";
const SESSION_DAYS = 30;
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 96 * 1024 * 1024 };

// ---------------------------------------------------------------------------
// Senha
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, 32, SCRYPT);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, N, r, p, saltB64, keyB64] = parts;
  try {
    const salt = Buffer.from(saltB64, "base64url");
    const expected = Buffer.from(keyB64, "base64url");
    const actual = await scrypt(password.normalize("NFKC"), salt, expected.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
      maxmem: SCRYPT.maxmem,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Usuario
// ---------------------------------------------------------------------------

interface UserRow extends User {
  password_hash: string;
}

export async function userCount(): Promise<number> {
  return (await get<{ n: number }>("SELECT COUNT(*) AS n FROM users"))?.n ?? 0;
}

/**
 * Garante que existe um operador. Usa NEXUS_EMAIL/NEXUS_PASSWORD na primeira
 * inicializacao; se nao houver variaveis, o /login mostra o passo de setup.
 */
export async function ensureSeedUser(): Promise<void> {
  if ((await userCount()) > 0) return;
  const email = process.env.NEXUS_EMAIL?.trim().toLowerCase();
  const password = process.env.NEXUS_PASSWORD;
  if (!email || !password || password.length < 8) return;
  await createUser(email, password, process.env.NEXUS_OWNER_NAME?.trim() || "Operador");
}

export async function createUser(email: string, password: string, name: string): Promise<string> {
  const id = randomUUID();
  await run("INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)", [
    id,
    email.trim().toLowerCase(),
    name,
    await hashPassword(password),
  ]);
  return id;
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  return get<UserRow>("SELECT * FROM users WHERE email = ?", [email.trim().toLowerCase()]);
}

export async function changePassword(userId: string, password: string) {
  await run("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", [
    await hashPassword(password),
    userId,
  ]);
}

// ---------------------------------------------------------------------------
// Rate limit de login
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 8;
const WINDOW_MINUTES = 15;

export async function loginLocked(identifier: string): Promise<number> {
  const row = await get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM login_attempts
     WHERE identifier = ? AND ok = 0 AND created_at > datetime('now', ?)`,
    [identifier, `-${WINDOW_MINUTES} minutes`],
  );
  const failures = row?.n ?? 0;
  return failures >= MAX_ATTEMPTS ? WINDOW_MINUTES : 0;
}

export async function recordAttempt(identifier: string, ok: boolean) {
  await run("INSERT INTO login_attempts (identifier, ok) VALUES (?, ?)", [identifier, ok ? 1 : 0]);
  if (ok) await run("DELETE FROM login_attempts WHERE identifier = ?", [identifier]);
  await run("DELETE FROM login_attempts WHERE created_at < datetime('now', '-1 day')");
}

// ---------------------------------------------------------------------------
// Sessao
// ---------------------------------------------------------------------------

/**
 * Segredo que assina os tokens de sessão. Obrigatório em produção — sem ele o
 * app se recusa a emitir sessão, em vez de cair silenciosamente num padrão
 * fraco. Em desenvolvimento, gera e guarda um segredo local na primeira vez.
 */
async function sessionSecret(): Promise<string> {
  const fromEnv = process.env.NEXUS_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 32) return fromEnv;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXUS_SECRET ausente ou curto demais (mínimo 32 caracteres). " +
        "Gere um com: node -e \"console.log(require('node:crypto').randomBytes(48).toString('base64url'))\"",
    );
  }

  let local = await setting("dev_session_secret", "");
  if (!local) {
    local = randomBytes(32).toString("base64url");
    await setSetting("dev_session_secret", local);
  }
  return local;
}

/** Guardamos só o HMAC do token: nem o banco nem um backup revelam a sessão. */
const signToken = async (value: string) =>
  createHmac("sha256", await sessionSecret()).update(value).digest("hex");

function secureCookies(): boolean {
  return process.env.NODE_ENV === "production" || process.env.NEXUS_FORCE_SECURE_COOKIES === "1";
}

export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const id = randomUUID();
  const ua = (await headers()).get("user-agent")?.slice(0, 250) ?? null;
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await run("INSERT INTO sessions (id, user_id, token_hash, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)", [
    id,
    userId,
    await signToken(token),
    ua,
    expires.toISOString(),
  ]);
  await run("DELETE FROM sessions WHERE expires_at < datetime('now')");

  (await cookies()).set(SESSION_COOKIE, `${id}.${token}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(),
    path: "/",
    expires,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) {
    const [id] = raw.split(".");
    if (id) await run("DELETE FROM sessions WHERE id = ?", [id]);
  }
  jar.delete(SESSION_COOKIE);
}

export async function endAllSessions(userId: string): Promise<void> {
  await run("DELETE FROM sessions WHERE user_id = ?", [userId]);
  (await cookies()).delete(SESSION_COOKIE);
}

/** Usuario da requisicao atual, ou null. Memoizado por render. */
export const currentUser = cache(async (): Promise<User | null> => {
  await ready(); // garante schema carregado
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const sep = raw.indexOf(".");
  if (sep <= 0) return null;
  const id = raw.slice(0, sep);
  const token = raw.slice(sep + 1);

  const row = await get<{ token_hash: string; user_id: string; expires_at: string }>(
    "SELECT token_hash, user_id, expires_at FROM sessions WHERE id = ?",
    [id],
  );
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await run("DELETE FROM sessions WHERE id = ?", [id]);
    return null;
  }
  const a = Buffer.from(await signToken(token));
  const b = Buffer.from(row.token_hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  await run("UPDATE sessions SET last_seen_at = datetime('now') WHERE id = ?", [id]);
  return (await get<User>("SELECT id, email, name, created_at FROM users WHERE id = ?", [row.user_id])) ?? null;
});

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export interface SessionInfo {
  id: string;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  current: boolean;
}

export async function listSessions(userId: string): Promise<SessionInfo[]> {
  const currentId = (await cookies()).get(SESSION_COOKIE)?.value?.split(".")[0] ?? "";
  return (
    await all<Omit<SessionInfo, "current">>(
      "SELECT id, user_agent, created_at, last_seen_at, expires_at FROM sessions WHERE user_id = ? ORDER BY last_seen_at DESC",
      [userId],
    )
  ).map((s) => ({ ...s, current: s.id === currentId }));
}
