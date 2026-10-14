import { NextResponse, type NextRequest } from "next/server";

const RESPONDENT_PATHS = ["/persetujuan", "/pretest", "/beranda", "/catat", "/riwayat"];

/**
 * Pengalihan kasar saja: tanpa cookie sesi → halaman masuk.
 * BUKAN kontrol akses. Peran dan validitas sesi diperiksa di setiap halaman dan endpoint (ADR-001).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && !req.cookies.has("pm_staf")) {
    return NextResponse.redirect(new URL("/staf/masuk", req.url));
  }
  if (
    RESPONDENT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) &&
    !req.cookies.has("pm_resp")
  ) {
    return NextResponse.redirect(new URL("/masuk", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/persetujuan/:path*",
    "/pretest/:path*",
    "/beranda/:path*",
    "/catat/:path*",
    "/riwayat/:path*",
  ],
};
