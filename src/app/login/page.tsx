import { redirect } from "next/navigation";

import { currentUser, ensureSeedUser, userCount } from "@/lib/auth";

import { LoginForm } from "./LoginForm";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  await ensureSeedUser();
  if (await currentUser()) redirect("/");
  const needsSetup = userCount() === 0;

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10">
      <div className="cockpit-grid" />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-22rem] left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full opacity-[0.16] blur-[120px]"
        style={{ background: "radial-gradient(circle, var(--accent), transparent 68%)" }}
      />
      <LoginForm needsSetup={needsSetup} next={next ?? "/"} />
    </main>
  );
}
