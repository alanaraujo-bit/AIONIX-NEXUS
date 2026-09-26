import { NextResponse, type NextRequest } from "next/server";

/**
 * Atalho de roteamento: quem não tem cookie de sessão nem chega a renderizar
 * as páginas privadas. A verificação real (assinatura, validade, usuário) é
 * feita no servidor, em `requireUser()` — isto aqui é só para evitar um
 * render desnecessário e mandar o visitante direto para o login.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get("nexus_session")?.value);

  if (!hasSession && pathname !== "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (hasSession && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
