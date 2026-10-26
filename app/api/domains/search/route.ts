import { NextRequest, NextResponse } from "next/server";
import {
  parseDomainQuery,
  searchDomains,
  type SearchResponse,
} from "@/lib/domain-search";
import { ResellerClubError } from "@/lib/resellerclub";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/domains/search?q=mybusiness
 *      GET /api/domains/search?q=mybusiness.com
 *
 * Checks availability through ResellerClub (or deterministic mock mode when
 * no credentials are configured) and returns retail-priced results.
 * Route handlers are not cached by default in Next 16 — every request hits
 * the registrar, which is exactly what a domain search needs.
 */
export async function GET(request: NextRequest) {
  // Availability checks hit an external registrar, so they are rate limited
  // per caller before anything else happens.
  const limit = rateLimit(`domains:search:${clientIp(request)}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `Too many searches — please wait ${limit.retryAfterSeconds}s before trying again.`,
        results: [],
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const raw = request.nextUrl.searchParams.get("q") ?? "";
  const parsed = parseDomainQuery(raw);

  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error, results: [] }, { status: 400 });
  }

  try {
    const data: SearchResponse = await searchDomains(parsed);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    if (err instanceof ResellerClubError) {
      const status = err.code === "auth" ? 502 : err.code === "not-configured" ? 503 : 502;
      console.error(`[domains/search] ${err.code}: ${err.message}`);
      return NextResponse.json(
        {
          error:
            err.code === "auth"
              ? "We couldn’t verify our domain provider credentials. Please try again shortly."
              : "We couldn’t reach the domain registry right now. Please try again in a moment.",
          results: [],
        },
        { status },
      );
    }
    console.error("[domains/search] unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong while searching. Please try again.", results: [] },
      { status: 500 },
    );
  }
}
