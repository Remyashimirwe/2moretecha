import { NextRequest, NextResponse } from "next/server";
import { getCostPrices, getMode } from "@/lib/resellerclub";
import { quoteSync, salesCurrency } from "@/lib/pricing";
import { getTldInfo } from "@/lib/tlds";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/domains/prices?tlds=com,net,org,io
 *
 * Server-side retail quotes used for the "from $x/yr" extension labels.
 * Prices are computed here from ResellerClub cost prices (or the configured
 * catalogue fallback) — the browser never supplies or trusts a price.
 *
 * TLDs we do not actually sell are omitted instead of being given an
 * invented price, so the UI can simply not render a label for them.
 */

const TLD_RE = /^[a-z0-9]([a-z0-9-]{0,23}[a-z0-9])?$/;
const MAX_TLDS = 12;

export async function GET(request: NextRequest) {
  const limit = rateLimit(`domains:prices:${clientIp(request)}`, 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests — please try again shortly.", prices: [] },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const raw = request.nextUrl.searchParams.get("tlds") ?? "";
  const requested = [
    ...new Set(
      raw
        .split(",")
        .map((t) => t.trim().toLowerCase().replace(/^\./, ""))
        .filter(Boolean),
    ),
  ].slice(0, MAX_TLDS);

  const valid = requested.filter((tld) => TLD_RE.test(tld));
  if (valid.length === 0) {
    return NextResponse.json(
      { error: "Pass at least one extension, e.g. ?tlds=com,net,org", prices: [] },
      { status: 400 },
    );
  }

  const mode = getMode();
  const costPrices = mode === "live" ? await getCostPrices().catch(() => null) : null;

  const prices = valid.flatMap((tld) => {
    const register = quoteSync(tld, "register", costPrices);
    const renew = quoteSync(tld, "renew", costPrices);
    // An unknown TLD would silently inherit the default fallback price —
    // that is not a real price, so we leave it out entirely.
    const supported = Boolean(getTldInfo(tld)) || register.source === "resellerclub";
    if (!supported) return [];
    return [
      {
        tld,
        price: register.price,
        renewalPrice: renew.price,
        currency: register.currency,
        source: register.source,
      },
    ];
  });

  return NextResponse.json(
    { mode, currency: salesCurrency(), prices },
    // Quotes come from config/live cost prices; a short cache is enough.
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } },
  );
}
