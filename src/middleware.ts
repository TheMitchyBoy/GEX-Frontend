import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (!user || !password) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const encoded = authHeader.slice(6);
    try {
      const decoded = atob(encoded);
      const colon = decoded.indexOf(":");
      const u = decoded.slice(0, colon);
      const p = decoded.slice(colon + 1);
      if (u === user && p === password) {
        return NextResponse.next();
      }
    } catch {
      // invalid base64
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="GEX Dashboard"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health|api/ready|api/db-info|api/schema).*)"],
};
