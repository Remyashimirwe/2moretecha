"use client";

import Link from "next/link";
import { estimateLine, useCart } from "@/components/cart-context";
import { formatMoney } from "@/lib/money";

const YEAR_OPTIONS = [1, 2, 3, 4, 5, 10];

export default function CartPage() {
  const { items, remove, setYears, clear, totalMinor, hydrated } = useCart();
  const currency = items[0]?.currency ?? "USD";

  return (
    <div className="min-h-full bg-black">
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Cart</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">
            Your cart
          </h1>
        </div>
        {hydrated && items.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-sm font-medium text-slate-500 transition-colors hover:text-red-600"
          >
            Clear cart
          </button>
        )}
      </div>

      {!hydrated && <p className="mt-8 text-sm text-slate-500">Loading your cart…</p>}

      {hydrated && items.length === 0 && (
        <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-brand-50 p-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-100 text-brand-600">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-7 w-7"
              aria-hidden
            >
              <circle cx="9" cy="9" r="6" />
              <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
            </svg>
          </span>
          <p className="mt-4 text-sm font-medium text-navy-950">Your cart is empty.</p>
          <p className="mt-1 text-sm text-slate-600">
            Search for a domain and select it to get started.
          </p>
          <Link
            href="/domains"
            className="mt-5 inline-flex rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-950/20 transition-colors hover:bg-brand-700"
          >
            Find your domain
          </Link>
        </div>
      )}

      {hydrated && items.length > 0 && (
        <>
          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <ul>
              {items.map((item) => (
                <li
                  key={item.domain}
                  className="flex flex-col gap-4 border-b border-slate-100 px-4 py-5 transition-colors last:border-b-0 hover:bg-brand-50 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-base font-semibold text-navy-950">
                        {item.domain}
                      </span>
                      {item.premium && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                          Premium
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <label className="flex items-center gap-2">
                        <span>Period</span>
                        <select
                          value={item.years}
                          onChange={(e) => setYears(item.domain, Number(e.target.value))}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-navy-950 outline-none transition-shadow focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                        >
                          {YEAR_OPTIONS.map((y) => (
                            <option key={y} value={y}>
                              {y} {y === 1 ? "year" : "years"}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => remove(item.domain)}
                        className="font-medium text-slate-500 transition-colors hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-navy-950 tabular-nums">
                      {formatMoney(estimateLine(item) / 100, item.currency)}
                    </div>
                    {item.years > 1 && (
                      <div className="text-xs text-slate-500">
                        {formatMoney(item.renewalMinor / 100, item.currency)}/yr after year 1
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">
                Total ({items.length} {items.length === 1 ? "domain" : "domains"})
              </span>
              <span className="text-2xl font-bold text-navy-950 tabular-nums">
                {formatMoney(totalMinor / 100, currency)}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Final prices and availability are confirmed by our registrar when you check out.
            </p>
            <Link
              href="/checkout"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-950/15 transition-all hover:bg-brand-700 active:scale-[0.99]"
            >
              Proceed to checkout
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/domains"
              className="mt-3 block text-center text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
            >
              Add more domains
            </Link>
          </div>
        </>
      )}
    </div>
    </div>
  );
}
