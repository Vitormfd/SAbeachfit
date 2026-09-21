import { NextResponse, type NextRequest } from "next/server";

// Primeira barreira (rápida, sem banco): exige cookie de sessão nas rotas administrativas.
// A validação real da sessão é feita no servidor por requireAdmin() em cada página/ação.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isLogin = pathname === "/admin/login";
  const hasCookie = !!req.cookies.get("sa_admin")?.value;
  if (!isLogin && !hasCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
