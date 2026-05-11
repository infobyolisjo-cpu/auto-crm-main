import { NextRequest, NextResponse } from "next/server";

/**
 * Shared API authentication helper.
 *
 * Checks the `x-crm-secret` header against the `CRM_API_SECRET` environment variable.
 *
 * Behaviour:
 *   - If CRM_API_SECRET is not set: allow all requests (local-dev / unconfigured).
 *   - If CRM_API_SECRET is set: require the header to match exactly.
 *
 * Usage in a route handler:
 *   const denied = checkCrmAuth(request);
 *   if (denied) return denied;
 *
 * Returns a 401 NextResponse when the check fails, or null when the caller may proceed.
 */
export function checkCrmAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.CRM_API_SECRET;
  if (!secret) return null;

  const header = request.headers.get("x-crm-secret");
  if (!header || header !== secret) {
    return NextResponse.json(
      { error: "No autorizado — se requiere el header x-crm-secret" },
      { status: 401 }
    );
  }

  return null;
}
