"use client";

import { estimateLine, useCart } from "@/components/cart-context";
import { formatMoney } from "@/lib/money";

export default function DashboardDomainCart({ onCheckout }: { onCheckout: () => void }) {
  const { items, remove, totalMinor, hydrated } = useCart();
  const currency = items[0]?.currency ?? "USD";

  return (
    <aside className="h-fit rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_26px_60px_-46px_rgba(16,28,58,0.8)] sm:p-6 xl:sticky xl:top-24" aria-label="Domain cart">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-navy-950">Your cart</h2>
          <p className="mt-1 text-xs text-slate-500">
            {hydrated ? `${items.length} ${items.length === 1 ? "domain" : "domains"}` : "Loading cart…"}
          </p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-deep-blue ring-1 ring-inset ring-white/70 shadow-sm shadow-navy-950/5" aria-hidden>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 8H6" />
            <circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" />
          </svg>
        </span>
      </div>

      {!hydrated ? (
        <div className="mt-6 space-y-3" aria-hidden>
          <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-[#F7F9FD] px-4 py-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200/70" aria-hidden>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 8H6" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></svg>
          </span>
          <p className="mt-3 text-sm font-medium text-slate-700">Your cart is empty</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Select an available domain to add it here.</p>
        </div>
      ) : (
        <>
          <ul className="mt-5 divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.domain} className="-mx-2 flex items-start justify-between gap-3 rounded-xl px-2 py-3 transition-colors first:pt-0 hover:bg-brand-50/60">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy-950">{item.domain}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.years} {item.years === 1 ? "year" : "years"}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-navy-950">{formatMoney(estimateLine(item) / 100, item.currency)}</p>
                  <button type="button" onClick={() => remove(item.domain)} className="mt-1 text-xs font-medium text-slate-400 transition-colors hover:text-red-600">Remove</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-600">Estimated total</span>
              <span className="text-lg font-semibold tabular-nums text-navy-950">{formatMoney(totalMinor / 100, currency)}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">Final availability and prices are confirmed at checkout.</p>
            <button type="button" onClick={onCheckout} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-600 to-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_-18px_rgba(37,99,235,0.95)] ring-1 ring-inset ring-white/15 transition hover:shadow-[0_18px_34px_-16px_rgba(37,99,235,0.9)]">
              Continue to checkout <span aria-hidden>→</span>
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
