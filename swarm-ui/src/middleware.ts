import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7801";

// Paths that should be proxied to the backend
const PROXY_PATHS = ["/View/", "/Output/", "/ViewSpecial/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this path should be proxied
  const shouldProxy = PROXY_PATHS.some((path) => pathname.startsWith(path));

  if (shouldProxy) {
    // Rewrite to backend URL
    const url = new URL(pathname + request.nextUrl.search, BACKEND_URL);
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/View/:path*", "/Output/:path*", "/ViewSpecial/:path*"],
};
