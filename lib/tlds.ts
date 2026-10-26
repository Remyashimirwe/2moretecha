/**
 * TLD catalogue for the 2-MoreTechs domain storefront.
 *
 * `productKey` is ResellerClub's internal key used to look up your cost price
 * in the `products/customer-price.json` response (official mapping:
 * https://resellerclub.webpropanel.com/kb/answer/1918). If a key is missing or
 * wrong, pricing gracefully falls back to `defaultRetail`.
 *
 * `defaultRetail` is only used as a display fallback (and in mock mode) —
 * always confirm your real margins before going live.
 */
export type TldInfo = {
  tld: string;
  /** ResellerClub product key for this TLD (see "Product Keys" in their API docs). */
  productKey: string;
  /** Fallback retail price per year, USD — used when the live cost price is unavailable. */
  defaultRetail: number;
  /** Short marketing blurb shown on the pricing cards. */
  tagline: string;
};

export const TLD_CATALOG: TldInfo[] = [
  { tld: "com", productKey: "domcno", defaultRetail: 15, tagline: "The global standard" },
  { tld: "net", productKey: "dotnet", defaultRetail: 18, tagline: "Built for networks" },
  { tld: "org", productKey: "domorg", defaultRetail: 16, tagline: "Trusted by communities" },
  { tld: "info", productKey: "dominfo", defaultRetail: 12, tagline: "Made for information" },
  { tld: "co", productKey: "dotco", defaultRetail: 24, tagline: "Short for company" },
  { tld: "biz", productKey: "dombiz", defaultRetail: 14, tagline: "Made for business" },
  { tld: "me", productKey: "dotme", defaultRetail: 18, tagline: "All about you" },
  { tld: "io", productKey: "dotio", defaultRetail: 45, tagline: "Loved by tech startups" },
  { tld: "ai", productKey: "dotai", defaultRetail: 70, tagline: "The AI address" },
];

export const TLD_BY_KEY: Record<string, TldInfo> = Object.fromEntries(
  TLD_CATALOG.map((t) => [t.tld, t]),
);

/** TLDs checked when the customer searches for a bare keyword (no dot). */
export function defaultSearchTlds(): string[] {
  const raw = process.env.DOMAIN_SEARCH_TLDS?.trim();
  const list = raw
    ? raw.split(",").map((t) => t.trim().toLowerCase().replace(/^\./, "")).filter(Boolean)
    : ["com", "net", "org", "info", "co"];
  return list.slice(0, 10); // keep one API call well within ResellerClub's limits
}

/** The extensions highlighted on the homepage search bar. */
export const POPULAR_TLDS = ["com", "net", "org", "info", "co"];

export function getTldInfo(tld: string): TldInfo | undefined {
  return TLD_BY_KEY[tld.toLowerCase()];
}
