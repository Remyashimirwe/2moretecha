/**
 * Client-safe types shared between the search API and the browser UI.
 * Keep this file free of server-only code (no ResellerClub imports).
 */

export type DomainAvailability = "available" | "taken" | "unknown" | "unsupported";

export type SearchResult = {
  domain: string;
  tld: string;
  status: DomainAvailability;
  /** Raw status from the registrar (hovered as a tooltip in the UI). */
  rawStatus?: string;
  price?: number;
  renewalPrice?: number;
  currency: string;
  priceSource?: "resellerclub" | "catalog" | "premium";
  premium?: boolean;
  trademarkClaims?: boolean;
};

export type SearchResponse = {
  query: string;
  kind: "keyword" | "exact";
  mode: "live" | "mock";
  results: SearchResult[];
  checkedAt: string;
};

export type SearchErrorBody = {
  error: string;
  results?: SearchResult[];
};
