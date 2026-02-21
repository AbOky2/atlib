import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/login" ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/api/logout") ||
    pathname.startsWith("/api/setup") ||
    pathname === "/api/orders/create"
  ) {
    return NextResponse.next();
  }

  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/api/orders");
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get("restaurant_session")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard(.*)", "/api/orders(.*)", "/login"],
};
