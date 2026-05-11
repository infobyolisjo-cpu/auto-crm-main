import { NextRequest, NextResponse } from "next/server";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

function applyNoStoreHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export function middleware(request: NextRequest) {
  return applyNoStoreHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/",
    "/contacts/:path*",
    "/deals/:path*",
    "/activities/:path*",
    "/pipeline/:path*",
    "/settings/:path*",
    "/api/contacts/:path*",
    "/api/deals/:path*",
    "/api/activities/:path*",
    "/api/pipeline/:path*",
    "/api/followups/:path*",
    "/api/export/:path*",
    "/api/import/:path*",
    "/api/classify/:path*",
    "/api/digest/:path*",
  ],
};
