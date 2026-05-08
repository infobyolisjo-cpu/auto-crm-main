import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

export function noStoreJson(
  body: unknown,
  init: ResponseInit = {}
): NextResponse {
  const response = NextResponse.json(body, init);
  applyNoStoreHeaders(response);
  return response;
}

export function applyNoStoreHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(PRIVATE_CACHE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export function timingSafeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) return false;

  return timingSafeEqual(left, right);
}

export function readSecretHeader(
  request: NextRequest,
  headerNames: string[]
): string | null {
  for (const name of headerNames) {
    const value = request.headers.get(name);
    if (value) return value;
  }

  return null;
}

export function verifySharedSecret(
  request: NextRequest,
  options: {
    envNames: string[];
    headerNames: string[];
  }
): { ok: true } | { ok: false; status: number; error: string } {
  const expected = options.envNames
    .map((name) => process.env[name])
    .find((value): value is string => Boolean(value));

  if (!expected) {
    return {
      ok: false,
      status: 503,
      error: "Endpoint no configurado",
    };
  }

  const provided = readSecretHeader(request, options.headerNames);

  if (!provided || !timingSafeCompare(provided, expected)) {
    return {
      ok: false,
      status: 401,
      error: "No autorizado",
    };
  }

  return { ok: true };
}
