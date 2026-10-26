/** Client-safe money formatting (no server-only imports). */

const SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  RWF: "RF",
  INR: "₹",
};

export function formatMoney(amount: number, currency = "USD"): string {
  const value = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = SYMBOLS[currency.toUpperCase()];
  return symbol ? `${symbol}${value}` : `${value} ${currency.toUpperCase()}`;
}
