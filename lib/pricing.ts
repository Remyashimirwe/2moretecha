/**
 * Retail pricing service.
 *
 * ResellerClub's `products/customer-price.json` returns your *cost* price per
 * product. This module turns cost prices into the retail prices shown to
 * customers using DOMAIN_RETAIL_MARKUP_PERCENT, falling back to the catalogue
 * defaults when a live cost price isn't available.
 */
import { getCostPrices, getMarkupPercent, type CostPrices } from "./resellerclub";
import { getTldInfo } from "./tlds";
import { formatMoney } from "./money";

export { formatMoney };

export type PriceAction = "register" | "renew" | "transfer";

const ACTION_KEYS: Record<PriceAction, string> = {
  register: "addnewdomain",
  renew: "renewdomain",
  transfer: "addtransferdomain",
};

export type PriceQuote = {
  price: number;
  cost?: number;
  currency: string;
  /** "resellerclub" = live cost price; "catalog" = configured fallback price. */
  source: "resellerclub" | "catalog";
};

export function salesCurrency(): string {
  const c = (process.env.RESELLERCLUB_CURRENCY ?? "USD").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : "USD";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function applyMarkup(cost: number): number {
  const markup = getMarkupPercent();
  // Round up to the next cent so we never lose margin to rounding.
  return Math.ceil(cost * (1 + markup / 100) * 100) / 100;
}

function costFor(costPrices: CostPrices | null, tld: string, action: PriceAction): number | null {
  const info = getTldInfo(tld);
  if (!info || !costPrices) return null;
  const entry = costPrices[info.productKey]?.[ACTION_KEYS[action]]?.["1"];
  if (typeof entry === "number" && entry > 0) return entry;
  // Some responses return prices as strings.
  const asString = costPrices[info.productKey]?.[ACTION_KEYS[action]]?.["1"] as unknown;
  const n = Number(asString);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Quote the retail price for a TLD, given (optionally) pre-fetched cost prices. */
export function quoteSync(
  tld: string,
  action: PriceAction,
  costPrices: CostPrices | null,
): PriceQuote {
  const currency = salesCurrency();
  const info = getTldInfo(tld);
  const cost = costFor(costPrices, tld, action);
  if (cost !== null) {
    return { price: applyMarkup(cost), cost: round2(cost), currency, source: "resellerclub" };
  }
  const fallback = info?.defaultRetail ?? 15;
  return { price: fallback, currency, source: "catalog" };
}

/** Convenience wrapper that loads cost prices itself. */
export async function quote(tld: string, action: PriceAction): Promise<PriceQuote> {
  const costPrices = await getCostPrices().catch(() => null);
  return quoteSync(tld, action, costPrices);
}

/** Retail price for a premium domain using ResellerClub's costHash (already a cost). */
export function quotePremium(createCost: number): PriceQuote {
  const currency = salesCurrency();
  return { price: applyMarkup(createCost), cost: round2(createCost), currency, source: "resellerclub" };
}
