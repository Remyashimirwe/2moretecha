/**
 * Server-side checkout: validates the cart, RE-CHECKS availability and
 * RE-PRICES every item (client prices are never trusted), then creates a
 * PENDING order plus the payment order.
 */
import { getPrisma } from "./prisma";
import { parseDomainQuery } from "./domain-search";
import { checkAvailability, getCostPrices } from "./resellerclub";
import { quotePremium, quoteSync, salesCurrency } from "./pricing";
import { createPaymentOrder, getPaymentMode } from "./paypal";
import type { CostPrices } from "./resellerclub";

export type CheckoutItemInput = {
  domain: string;
  years: number;
};

export type CheckoutContactInput = {
  email: string;
  name: string;
  company?: string;
  addressLine1: string;
  city: string;
  state?: string;
  country: string;
  zipcode: string;
  phoneCc: string;
  phone: string;
};

export type PricedItem = {
  domain: string;
  tld: string;
  years: number;
  amountMinor: number;
};

export type CheckoutSuccess = {
  ok: true;
  orderId: string;
  amountMinor: number;
  currency: string;
  payment: {
    mode: "paypal" | "mock";
    paymentOrderId: string;
  };
  items: PricedItem[];
};

export type CheckoutFailure = { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_ITEMS = 12;
const MAX_YEARS = 10;

function fail(error: string): CheckoutFailure {
  return { ok: false, error };
}

function toMinor(price: number): number {
  return Math.round(price * 100);
}

/** Price one line: year 1 at registration price, remaining years at renewal. */
function priceLine(tld: string, years: number, costPrices: CostPrices | null, premium?: {
  create?: number;
  renew?: number;
}): number {
  if (premium?.create !== undefined) {
    const create = toMinor(quotePremium(premium.create).price);
    const renew = premium.renew !== undefined
      ? toMinor(quotePremium(premium.renew).price)
      : create;
    return create + renew * (years - 1);
  }
  const register = toMinor(quoteSync(tld, "register", costPrices).price);
  const renew = toMinor(quoteSync(tld, "renew", costPrices).price);
  return register + renew * (years - 1);
}

export async function createCheckout(input: {
  contact: CheckoutContactInput;
  items: CheckoutItemInput[];
}): Promise<CheckoutSuccess | CheckoutFailure> {
  const { contact, items } = input;

  /* ---------- validate contact ---------- */
  if (!EMAIL_RE.test(contact.email?.trim() ?? "")) return fail("Enter a valid email address.");
  if (!contact.name?.trim()) return fail("Enter your full name.");
  if (!contact.addressLine1?.trim()) return fail("Enter your street address.");
  if (!contact.city?.trim()) return fail("Enter your city.");
  if (!contact.country?.trim()) return fail("Enter your country.");
  if (!contact.zipcode?.trim()) return fail("Enter your postal/zip code.");
  if (!/^\+?\d{1,4}$/.test(contact.phoneCc?.trim() ?? "")) {
    return fail("Enter your phone country code (e.g. 250).");
  }
  if (!/^\d{6,15}$/.test((contact.phone ?? "").replace(/\s|-/g, ""))) {
    return fail("Enter a valid phone number.");
  }

  /* ---------- validate items ---------- */
  if (!Array.isArray(items) || items.length === 0) return fail("Your cart is empty.");
  if (items.length > MAX_ITEMS) return fail(`You can register up to ${MAX_ITEMS} domains at once.`);

  const seen = new Set<string>();
  const parsed: Array<{ label: string; tld: string; years: number; domain: string }> = [];

  for (const item of items) {
    const years = Math.trunc(Number(item.years ?? 1));
    if (!Number.isFinite(years) || years < 1 || years > MAX_YEARS) {
      return fail(`Registration period must be between 1 and ${MAX_YEARS} years.`);
    }
    const result = parseDomainQuery(item.domain ?? "");
    if ("error" in result) return result.error ? fail(result.error) : fail("Invalid domain.");
    if (result.kind !== "exact") return fail(`“${item.domain}” needs an extension, e.g. .com`);

    const fqdn = `${result.label}.${result.tld}`;
    if (seen.has(fqdn)) return fail(`“${fqdn}” appears twice in your cart.`);
    seen.add(fqdn);
    parsed.push({ label: result.label, tld: result.tld, years, domain: fqdn });
  }

  /* ---------- re-check availability (single bulk call) ---------- */
  const labels = [...new Set(parsed.map((p) => p.label))];
  const tlds = [...new Set(parsed.map((p) => p.tld))];
  const [availability, costPrices] = await Promise.all([
    checkAvailability(labels, tlds),
    getCostPrices().catch(() => null),
  ]).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : "availability check failed";
    throw new Error(message);
  });

  const byDomain = new Map(availability.map((e) => [e.domain.toLowerCase(), e]));
  for (const p of parsed) {
    const entry = byDomain.get(p.domain);
    if (!entry || entry.status !== "available") {
      return fail(`“${p.domain}” is no longer available. Remove it or pick another name.`);
    }
  }

  /* ---------- price on the server ---------- */
  const currency = salesCurrency();
  const pricedItems: PricedItem[] = parsed.map((p) => {
    const premium = byDomain.get(p.domain)?.premium;
    return {
      domain: p.domain,
      tld: p.tld,
      years: p.years,
      amountMinor: priceLine(p.tld, p.years, costPrices, premium),
    };
  });
  const totalMinor = pricedItems.reduce((sum, i) => sum + i.amountMinor, 0);
  if (totalMinor <= 0) return fail("Pricing is unavailable right now — please try again.");

  /* ---------- persist order (PENDING) ---------- */
  const prisma = getPrisma();
  const email = contact.email.trim().toLowerCase();

  const customer = await prisma.customer.upsert({
    where: { email },
    create: {
      email,
      name: contact.name.trim(),
      phone: contact.phone.replace(/\s|-/g, ""),
      phoneCc: contact.phoneCc.trim().replace(/^\+/, ""),
      country: contact.country.trim(),
      company: contact.company?.trim() || null,
      addressLine1: contact.addressLine1.trim(),
      city: contact.city.trim(),
      state: contact.state?.trim() || null,
      zipcode: contact.zipcode.trim(),
    },
    update: {
      name: contact.name.trim(),
      phone: contact.phone.replace(/\s|-/g, ""),
      phoneCc: contact.phoneCc.trim().replace(/^\+/, ""),
      country: contact.country.trim(),
      company: contact.company?.trim() || null,
      addressLine1: contact.addressLine1.trim(),
      city: contact.city.trim(),
      state: contact.state?.trim() || null,
      zipcode: contact.zipcode.trim(),
    },
  });

  const mode = getPaymentMode();
  const order = await prisma.order.create({
    data: {
      email,
      customerId: customer.id,
      amount: totalMinor,
      currency,
      status: "PENDING",
      paymentProvider: mode,
      items: {
        create: pricedItems.map((i) => ({
          domain: i.domain,
          tld: i.tld,
          years: i.years,
          amount: i.amountMinor,
          status: "pending",
        })),
      },
    },
    include: { items: true },
  });

  /* ---------- create the payment order (server-side amounts) ---------- */
  try {
    const payment = await createPaymentOrder({
      orderId: order.id,
      amountMinor: totalMinor,
      currency,
      description: `2-MoreTechs: ${pricedItems
        .map((i) => i.domain)
        .join(", ")}`,
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentOrderId: payment.paymentOrderId },
    });
    return {
      ok: true,
      orderId: order.id,
      amountMinor: totalMinor,
      currency,
      payment: { mode, paymentOrderId: payment.paymentOrderId },
      items: pricedItems,
    };
  } catch (err) {
    // Payment could not be set up — cancel the pending order.
    await prisma.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    const message = err instanceof Error ? err.message : "Could not start the payment.";
    return fail(message);
  }
}
