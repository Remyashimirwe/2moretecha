"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/money";
import { formatDate, type OrderItemView, type OrderView } from "@/lib/order-view";

function itemLabel(status: string): { text: string; className: string } {
  switch (status) {
    case "active":
      return {
        text: "Registered",
        className: "bg-green-100 text-green-700 ring-green-200",
      };
    case "registering":
      return {
        text: "Registering…",
        className: "bg-sky-50 text-sky-700 ring-sky-200",
      };
    case "failed":
      return { text: "Failed", className: "bg-red-50 text-red-700 ring-red-200" };
    default:
      return { text: "Queued", className: "bg-slate-100 text-slate-600 ring-slate-200" };
  }
}

export default function OrderStatus({ initial }: { initial: OrderView }) {
  const [data, setData] = useState<OrderView>(initial);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const needsPolling =
    data.status === "PENDING" ||
    data.items.some((i) => i.status === "pending" || i.status === "registering");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${initial.id}`, { cache: "no-store" });
      if (res.ok) setData((await res.json()) as OrderView);
    } catch {
      /* transient — next tick will retry */
    }
  }, [initial.id]);

  useEffect(() => {
    if (!needsPolling) return;
    const timer = setInterval(() => void refresh(), 3000);
    return () => clearInterval(timer);
  }, [needsPolling, refresh]);

  const activeItems = data.items.filter((i) => i.status === "active");
  const failedItems = data.items.filter((i) => i.status === "failed");
  const working = data.items.some((i) => i.status === "registering" || i.status === "pending");

  async function retryFailed() {
    setRetrying(true);
    setRetryError(null);
    try {
      const res = await fetch(`/api/orders/${initial.id}/retry`, { method: "POST" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) setRetryError(json.error ?? "Retry failed — please contact support.");
      await refresh();
    } catch {
      setRetryError("Network error — please try again.");
    } finally {
      setRetrying(false);
    }
  }

  /* ---------------- banner ---------------- */
  let banner: { title: string; body: string; tone: "success" | "working" | "wait" | "error" };
  if (data.status === "PENDING") {
    banner = {
      title: "Waiting for payment…",
      body: "Your order is confirmed once your payment completes. This page updates automatically.",
      tone: "wait",
    };
  } else if (data.status === "CANCELLED" || data.status === "FAILED") {
    banner = {
      title: `Order ${data.status.toLowerCase()}`,
      body: "This order did not complete. Start again from your cart.",
      tone: "error",
    };
  } else if (failedItems.length > 0 && activeItems.length === 0) {
    banner = {
      title: "Registration needs another try",
      body: "Your payment was received — the registrar rejected this registration. Retry below or contact support; you will not be charged again.",
      tone: "error",
    };
  } else if (working) {
    banner = {
      title: "Payment received — registering your domains…",
      body: "We’re creating your domains at the registry now. This usually takes a few seconds.",
      tone: "working",
    };
  } else {
    banner = {
      title: activeItems.length > 1 ? "All your domains are registered!" : "Your domain is registered!",
      body: "It will appear in your dashboard shortly. You can start setting up DNS or email for it now.",
      tone: "success",
    };
  }

  const toneClasses = {
    success: "border-green-200 bg-green-50 text-green-800",
    working: "border-sky-200 bg-sky-50 text-sky-800",
    wait: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-red-200 bg-red-50 text-red-800",
  }[banner.tone];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Order <span className="font-mono">{data.id.slice(-10)}</span>
      </p>

      <div className={`mt-4 rounded-3xl border p-6 ${toneClasses}`}>
        <h1 className="text-xl font-bold">{banner.title}</h1>
        <p className="mt-1.5 text-sm opacity-80">{banner.body}</p>
        {banner.tone === "working" && (
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-sky-100">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-sky-500" />
          </div>
        )}
      </div>

      {/* items */}
      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <ul>
          {data.items.map((item: OrderItemView) => {
            const label = itemLabel(item.status);
            return (
              <li
                key={item.domain}
                className="border-b border-slate-100 px-5 py-4 last:border-b-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-navy-950">{item.domain}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.years} {item.years === 1 ? "year" : "years"} · expires{" "}
                      {formatDate(item.expiresAt)}
                      {item.rcOrderId ? ` · registry order #${item.rcOrderId}` : ""}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${label.className}`}
                  >
                    {label.text}
                  </span>
                </div>
                {item.status === "failed" && item.lastError && (
                  <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    {item.lastError}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* payment summary */}
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Paid</span>
          <span className="font-bold text-navy-950 tabular-nums">
            {formatMoney(data.amount / 100, data.currency)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-slate-500">Payment method</span>
          <span className="font-medium text-slate-700">
            {data.paymentProvider === "mock" ? "Simulated (test mode)" : "PayPal"}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-slate-500">Status</span>
          <span className="font-medium text-slate-700">{data.status}</span>
        </div>
      </div>

      {retryError && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {retryError}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {failedItems.length > 0 && data.status === "PAID" && (
          <button
            type="button"
            onClick={retryFailed}
            disabled={retrying}
            className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-brand-900/15 transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {retrying ? "Retrying…" : "Retry registration"}
          </button>
        )}
        <Link
          href="/domains"
          className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-700"
        >
          Search more domains
        </Link>
        <a
          href="mailto:hello@2moretechs.com"
          className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-700"
        >
          Contact support
        </a>
      </div>
    </div>
  );
}
