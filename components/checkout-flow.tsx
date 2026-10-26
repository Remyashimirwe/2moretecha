"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  PayPalButtons,
  PayPalScriptProvider,
  type ReactPayPalScriptOptions,
} from "@paypal/react-paypal-js";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { estimateLine, useCart } from "@/components/cart-context";
import { formatMoney } from "@/lib/money";

type Contact = {
  email: string;
  name: string;
  company: string;
  addressLine1: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
  phoneCc: string;
  phone: string;
};

const EMPTY_CONTACT: Contact = {
  email: "",
  name: "",
  company: "",
  addressLine1: "",
  city: "",
  state: "",
  country: "Rwanda",
  zipcode: "",
  phoneCc: "250",
  phone: "",
};

type CreatedOrder = {
  orderId: string;
  amountMinor: number;
  currency: string;
  payment: { mode: "paypal" | "mock"; paymentOrderId: string };
  items: Array<{ domain: string; tld: string; years: number; amountMinor: number }>;
};

const FIELD =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-navy-950 outline-none transition-shadow placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
        {required && <span className="text-red-300"> *</span>}
      </span>
      {children}
    </label>
  );
}

function CheckoutInner({ onBackToCart }: { onBackToCart?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const inDashboard = pathname.startsWith("/account/");
  const searchParams = useSearchParams();
  const { items, clear, hydrated, totalMinor } = useCart();

  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT);
  const [created, setCreated] = useState<CreatedOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);

  const canceled = searchParams.get("canceled") === "1";
  const currency = created?.currency ?? items[0]?.currency ?? "USD";

  // Load the public PayPal client id only when we actually need the SDK.
  useEffect(() => {
    if (created?.payment.mode !== "paypal" || paypalClientId) return;
    let cancelled = false;
    fetch("/api/paypal/config")
      .then((r) => r.json())
      .then((cfg: { clientId?: string }) => {
        if (!cancelled && cfg.clientId) setPaypalClientId(cfg.clientId);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn’t load PayPal. Please refresh and try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [created, paypalClientId]);

  function set<K extends keyof Contact>(key: K, value: string) {
    setContact((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmitDetails(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact,
          items: items.map((i) => ({ domain: i.domain, years: i.years })),
        }),
      });
      const json = (await res.json()) as CreatedOrder & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not create your order.");
        return;
      }
      setCreated(json);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function finishPayment(orderId: string): Promise<boolean> {
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch(`/api/checkout/${orderId}/capture`, { method: "POST" });
      const json = (await res.json()) as { error?: string; status?: string };
      if (!res.ok) {
        setError(json.error ?? "Payment could not be completed.");
        return false;
      }
      clear();
      router.push(inDashboard ? "/account/orders" : `/orders/${orderId}`);
      return true;
    } catch {
      setError("Network error while confirming payment — please try again.");
      return false;
    } finally {
      setProcessing(false);
    }
  }

  async function paySimulated() {
    if (!created) return;
    await finishPayment(created.orderId);
  }

  const paypalOptions: ReactPayPalScriptOptions = useMemo(
    () => ({
      clientId: paypalClientId ?? "",
      currency: created?.currency ?? "USD",
      intent: "capture",
      components: ["buttons"],
    }),
    [paypalClientId, created?.currency],
  );

  const reviewLines = useMemo(() => {
    if (created) return created.items;
    return items.map((i) => ({
      domain: i.domain,
      tld: i.tld,
      years: i.years,
      amountMinor: estimateLine(i),
    }));
  }, [created, items]);

  const amountMinor = created?.amountMinor ?? totalMinor;

  /* ---------------- empty cart ---------------- */
  if (hydrated && items.length === 0 && !created) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-navy-950">Checkout</h1>
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-brand-50 p-10">
          <p className="text-sm text-slate-600">
            Your cart is empty — add a domain first{canceled ? " (payment was canceled)" : ""}.
          </p>
          {onBackToCart ? (
            <button type="button" onClick={onBackToCart} className="mt-5 inline-flex rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-950/20 transition-colors hover:bg-brand-700">
              Find your domain
            </button>
          ) : (
            <Link
              href={inDashboard ? "/account/domains/register" : "/domains"}
              className="mt-5 inline-flex rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-950/20 transition-colors hover:bg-brand-700"
            >
              Find your domain
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-navy-950">Checkout</h1>

      {canceled && !error && (
        <p className="mt-4 rounded-lg border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Payment was canceled — you can try again whenever you’re ready.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-300/30 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        {/* ---------------- left: form / payment ---------------- */}
        <div>
          {!created ? (
            <form onSubmit={onSubmitDetails} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <h2 className="flex items-center gap-2.5 text-base font-semibold text-navy-950">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  1
                </span>
                Registrant details
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                These details become the official WHOIS contact for your domain (ICANN requires
                them to be accurate).
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Email" required>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    className={FIELD}
                    value={contact.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="you@business.com"
                  />
                </Field>
                <Field label="Full name" required>
                  <input
                    required
                    autoComplete="name"
                    className={FIELD}
                    value={contact.name}
                    onChange={(e) => set("name", e.target.value)}
                  />
                </Field>
                <Field label="Company (optional)">
                  <input
                    autoComplete="organization"
                    className={FIELD}
                    value={contact.company}
                    onChange={(e) => set("company", e.target.value)}
                  />
                </Field>
                <Field label="Street address" required>
                  <input
                    required
                    autoComplete="street-address"
                    className={FIELD}
                    value={contact.addressLine1}
                    onChange={(e) => set("addressLine1", e.target.value)}
                  />
                </Field>
                <Field label="City" required>
                  <input
                    required
                    autoComplete="address-level2"
                    className={FIELD}
                    value={contact.city}
                    onChange={(e) => set("city", e.target.value)}
                  />
                </Field>
                <Field label="State / Province">
                  <input
                    autoComplete="address-level1"
                    className={FIELD}
                    value={contact.state}
                    onChange={(e) => set("state", e.target.value)}
                  />
                </Field>
                <Field label="Country" required>
                  <input
                    required
                    autoComplete="country-name"
                    className={FIELD}
                    value={contact.country}
                    onChange={(e) => set("country", e.target.value)}
                  />
                </Field>
                <Field label="Postal / ZIP code" required>
                  <input
                    required
                    autoComplete="postal-code"
                    className={FIELD}
                    value={contact.zipcode}
                    onChange={(e) => set("zipcode", e.target.value)}
                  />
                </Field>
                <Field label="Phone country code" required>
                  <input
                    required
                    inputMode="numeric"
                    className={FIELD}
                    value={contact.phoneCc}
                    onChange={(e) => set("phoneCc", e.target.value)}
                    placeholder="250"
                  />
                </Field>
                <Field label="Phone number" required>
                  <input
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    className={FIELD}
                    value={contact.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="780000000"
                  />
                </Field>
              </div>

              <button
                type="submit"
                disabled={submitting || items.length === 0}
                className="mt-6 w-full rounded-2xl bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-950/15 transition-all hover:bg-brand-700 active:scale-[0.99] disabled:opacity-60"
              >
                {submitting ? "Checking availability…" : "Continue to payment"}
              </button>
            </form>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <h2 className="flex items-center gap-2.5 text-base font-semibold text-navy-950">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  2
                </span>
                Payment
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Your domains are registered automatically the moment payment is confirmed.
              </p>

              <div className="mt-5 rounded-2xl bg-brand-50 p-4 text-sm ring-1 ring-brand-200">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-600">Total due today</span>
                  <span className="text-lg font-bold text-navy-950 tabular-nums">
                    {formatMoney(amountMinor / 100, created.currency)}
                  </span>
                </div>
              </div>

              <div className="mt-5 min-h-[180px]">
                {created.payment.mode === "mock" ? (
                  <button
                    type="button"
                    onClick={paySimulated}
                    disabled={processing}
                    className="w-full rounded-2xl bg-brand-600 px-6 py-4 text-sm font-semibold text-white shadow-md shadow-blue-950/15 transition-all hover:bg-brand-700 disabled:opacity-60"
                  >
                    {processing
                      ? "Confirming payment…"
                      : `Pay ${formatMoney(amountMinor / 100, created.currency)} (simulated)`}
                  </button>
                ) : paypalClientId ? (
                  <PayPalScriptProvider key={paypalClientId} options={paypalOptions}>
                    <PayPalButtons
                      style={{ layout: "vertical", color: "blue", shape: "rect", height: 48 }}
                      createOrder={() => Promise.resolve(created.payment.paymentOrderId)}
                      onApprove={async (data) => {
                        await finishPayment(data.orderID);
                      }}
                      onError={() => {
                        setError("PayPal reported an error — you have not been charged.");
                        setProcessing(false);
                      }}
                      onCancel={() => {
                        setProcessing(false);
                      }}
                    />
                  </PayPalScriptProvider>
                ) : (
                  <div className="grid h-[120px] place-items-center rounded-xl border border-slate-200 text-sm text-slate-400">
                    Loading PayPal…
                  </div>
                )}
              </div>

              <p className="mt-4 text-center text-xs text-slate-500">
                Payment is verified on our server before any domain is registered.
              </p>
            </div>
          )}
        </div>

        {/* ---------------- right: order review ---------------- */}
        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-navy-950">Order summary</h2>
          <ul className="mt-4 space-y-3">
            {reviewLines.map((line) => (
              <li key={line.domain} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <div className="font-medium text-navy-950">{line.domain}</div>
                  <div className="text-xs text-slate-500">
                    {line.years} {line.years === 1 ? "year" : "years"}
                    {created ? "" : " · est."}
                  </div>
                </div>
                <div className="tabular-nums text-slate-600">
                  {formatMoney(line.amountMinor / 100, currency)}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
            <span className="text-sm font-semibold text-slate-600">Total</span>
            <span className="text-xl font-bold text-navy-950 tabular-nums">
              {formatMoney(amountMinor / 100, currency)}
            </span>
          </div>
          {created && (
            <div className="mt-4 rounded-lg bg-brand-50 p-3 text-xs text-slate-500">
              Registrant: <span className="text-navy-950">{created ? contact.email : ""}</span>
            </div>
          )}
          {onBackToCart ? (
            <button type="button" onClick={onBackToCart} className="mt-4 block w-full text-center text-sm font-medium text-brand-600 transition-colors hover:text-brand-700">
              ← Back to domain search
            </button>
          ) : (
            <Link
              href={inDashboard ? "/account/domains/register" : "/cart"}
              className="mt-4 block text-center text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
            >
              ← Back to cart
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function CheckoutPage({ onBackToCart }: { onBackToCart?: () => void } = {}) {
  return (
    <Suspense fallback={null}>
      <CheckoutInner onBackToCart={onBackToCart} />
    </Suspense>
  );
}
