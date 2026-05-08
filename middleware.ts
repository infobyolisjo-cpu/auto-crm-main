import { NextRequest, NextResponse } from "next/server";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

const PRIVATE_PAGE_PATHS = [
  "/",
  "/contacts",
  "/deals",
  "/activities",
  "/pipeline",
  "/settings",
];

const PRIVATE_API_PREFIXES = [
  "/api/contacts",
  "/api/deals",
  "/api/activities",
  "/api/pipeline",
  "/api/followups",
  "/api/export",
  "/api/import",
  "/api/classify",
  "/api/digest",
];

function isPrivatePath(pathname: string): boolean {
  return (
    PRIVATE_PAGE_PATHS.some(
      (path) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`))
    ) || PRIVATE_API_PREFIXES.some((path) => pathname.startsWith(path))
  );
}

function unauthorized(message = "Authentication required"): NextResponse {
  const response = new NextResponse(message, {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Auto-CRM", charset="UTF-8"',
    },
  });

  return applyNoStoreHeaders(response);
}

function serviceUnavailable(): NextResponse {
  return applyNoStoreHeaders(
    new NextResponse("CRM auth is not configured", { status: 503 })
  );
}

function applyNoStoreHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(PRIVATE_CACHE_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

function decodeBasicAuth(value: string): string | null {
  try {
    return atob(value);
  } catch {
    return null;
  }
}

function timingSafeCompare(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);

  if (left.length !== right.length) return false;

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left[index] ^ right[index];
  }

  return result === 0;
}

function hasValidBasicAuth(request: NextRequest): boolean {
  const username = process.env.CRM_AUTH_USERNAME;
  const password = process.env.CRM_AUTH_PASSWORD;

  if (!username || !password) return false;

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) return false;

  const decoded = decodeBasicAuth(authorization.slice("Basic ".length));
  if (!decoded) return false;

  const separator = decoded.indexOf(":");
  if (separator === -1) return false;

  const providedUsername = decoded.slice(0, separator);
  const providedPassword = decoded.slice(separator + 1);

  return (
    timingSafeCompare(providedUsername, username) &&
    timingSafeCompare(providedPassword, password)
  );
}

export function middleware(request: NextRequest) {
  if (!isPrivatePath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (!process.env.CRM_AUTH_USERNAME || !process.env.CRM_AUTH_PASSWORD) {
    return serviceUnavailable();
  }

  if (!hasValidBasicAuth(request)) {
    return unauthorized();
  }

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
