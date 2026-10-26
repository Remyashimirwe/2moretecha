/**
 * Orchestrates a domain search: parse/validate the customer's input, ask
 * ResellerClub for availability, then price every result for retail display.
 */
import { checkAvailability, getCostPrices, getMode } from "./resellerclub";
import { quotePremium, quoteSync } from "./pricing";
import { defaultSearchTlds } from "./tlds";
import type { SearchResponse, SearchResult } from "./domain-types";

export type { SearchResponse, SearchResult };

export type ParsedQuery =
  | { kind: "keyword"; label: string }
  | { kind: "exact"; label: string; tld: string };

const LABEL_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD_RE = /^[a-z0-9]([a-z0-9-]{0,23}[a-z0-9])?$/;

/**
 * Accepts what people actually type: "mybusiness",
 * "mybusiness.com", "https://www.mybusiness.co/", " MyBusiness ".
 * Returns a typed error message for anything invalid.
 */
export function parseDomainQuery(raw: string): ParsedQuery | { error: string } {
  let q = (raw ?? "").trim().toLowerCase();
  if (!q) return { error: "Enter a domain name to search." };

  q = q.replace(/^https?:\/\//, "").replace(/^www\./, "");
  q = q.split("/")[0].split("?")[0].trim();
  q = q.replace(/\.$/, "");

  if (!q) return { error: "Enter a domain name to search." };
  if (/\s/.test(q)) {
    return { error: "Domain names cannot contain spaces — try something like “mybusiness”." };
  }
  if (!/^[a-z0-9.-]+$/.test(q)) {
    return { error: "Only letters, numbers, hyphens and dots are allowed." };
  }

  if (q.includes(".")) {
    const dot = q.lastIndexOf(".");
    const label = q.slice(0, dot);
    const tld = q.slice(dot + 1);
    if (label.includes(".")) {
      // Two or more dots: a subdomain, or a second-level extension such as
      // ".co.tz" that this storefront does not sell yet. Say that plainly
      // instead of blaming hyphens.
      return {
        error:
          "We can check one name and extension at a time (e.g. mybusiness.com). Try searching just the name.",
      };
    }
    if (!LABEL_RE.test(label)) {
      return { error: "That domain name isn’t valid — labels can’t start or end with a hyphen." };
    }
    if (!isValidTld(tld)) return { error: "That extension isn’t valid." };
    return { kind: "exact", label, tld };
  }

  if (!LABEL_RE.test(q)) {
    return { error: "That domain name isn’t valid — labels can’t start or end with a hyphen." };
  }
  return { kind: "keyword", label: q };
}

function isValidTld(tld: string): boolean {
  return TLD_RE.test(tld);
}

export async function searchDomains(parsed: ParsedQuery): Promise<SearchResponse> {
  const mode = getMode();
  const tlds = parsed.kind === "exact" ? [parsed.tld] : defaultSearchTlds();

  const [availability, costPrices] = await Promise.all([
    checkAvailability([parsed.label], tlds),
    getCostPrices().catch(() => null),
  ]);

  const byDomain = new Map(availability.map((e) => [e.domain.toLowerCase(), e]));

  const results: SearchResult[] = tlds.map((tld) => {
    const domain = `${parsed.label}.${tld}`;
    const entry = byDomain.get(domain);
    const status = entry?.status ?? "unknown";

    const base: SearchResult = {
      domain,
      tld,
      status,
      rawStatus: entry?.rawStatus,
      currency: quoteSync(tld, "register", costPrices).currency,
      trademarkClaims: entry?.trademarkClaims,
    };

    if (status !== "available") return base;

    // Premium names: ResellerClub returns the real cost in costHash.
    const premiumCreate = entry?.premium?.create;
    const premiumRenew = entry?.premium?.renew;
    if (premiumCreate !== undefined) {
      const q = quotePremium(premiumCreate);
      return {
        ...base,
        price: q.price,
        renewalPrice: premiumRenew !== undefined ? quotePremium(premiumRenew).price : q.price,
        priceSource: "premium",
        premium: true,
        currency: q.currency,
      };
    }

    const register = quoteSync(tld, "register", costPrices);
    const renew = quoteSync(tld, "renew", costPrices);
    return {
      ...base,
      price: register.price,
      renewalPrice: renew.price,
      priceSource: register.source,
      premium: false,
      currency: register.currency,
    };
  });

  return {
    query: parsed.kind === "exact" ? `${parsed.label}.${parsed.tld}` : parsed.label,
    kind: parsed.kind,
    mode,
    results,
    checkedAt: new Date().toISOString(),
  };
}
