/** Client-safe shapes for order status views (shared by page + poller). */

export type OrderItemView = {
  domain: string;
  tld: string;
  years: number;
  amount: number;
  status: string; // pending | registering | active | failed
  rcOrderId: number | null;
  registeredAt: string | null;
  expiresAt: string | null;
  lastError: string | null;
};

export type OrderView = {
  id: string;
  status: string; // PENDING | PAID | FAILED | CANCELLED
  amount: number;
  currency: string;
  paymentProvider: string;
  createdAt: string | null;
  items: OrderItemView[];
};

export function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
